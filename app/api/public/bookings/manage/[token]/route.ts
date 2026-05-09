/**
 * Public booking management by managementToken.
 * GET  → returns booking details
 * POST → cancel or reschedule (body: { action: "cancel" } | { action: "reschedule", startsAt, endsAt })
 */

import { BookingStatus, Prisma } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { deleteBookingFromGoogleCalendar } from "@/lib/calendar/google";
import { deleteBookingFromOutlookCalendar } from "@/lib/calendar/outlook";

export const dynamic = "force-dynamic";

type RouteParams = { params: { token: string } };

async function loadBooking(token: string) {
  return prisma.booking.findFirst({
    where: { managementToken: token },
    include: {
      service: { select: { id: true, name: true, durationMinutes: true, pricePence: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
      staffMember: { select: { id: true, fullName: true } },
      business: {
        select: {
          id: true,
          name: true,
          subdomain: true,
          timezone: true,
          allowCustomerCancelReschedule: true,
          cancellationNoticeHours: true,
          bookingBufferMinutes: true,
          subscriptionTier: true,
        },
      },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<Response> {
  const booking = await loadBooking(params.token);
  if (!booking) return jsonError("Booking not found.", 404);

  return jsonOk({
    bookingId: booking.id,
    status: booking.status,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    service: booking.service,
    staffMember: booking.staffMember,
    customer: {
      fullName: booking.customer.fullName,
      email: booking.customer.email,
    },
    business: {
      name: booking.business.name,
      subdomain: booking.business.subdomain,
      timezone: booking.business.timezone,
      allowCancelReschedule: booking.business.allowCustomerCancelReschedule,
      cancellationNoticeHours: booking.business.cancellationNoticeHours,
    },
  });
}

export async function POST(
  req: Request,
  { params }: RouteParams,
): Promise<Response> {
  const booking = await loadBooking(params.token);
  if (!booking) return jsonError("Booking not found.", 404);

  if (!booking.business.allowCustomerCancelReschedule) {
    return jsonError("This business does not allow self-service changes.", 403);
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return jsonError("Only confirmed bookings can be changed.", 409);
  }

  // Enforce notice period
  const noticeMs = booking.business.cancellationNoticeHours * 60 * 60 * 1000;
  if (booking.startsAt.getTime() - Date.now() < noticeMs) {
    return jsonError(
      `Changes must be made at least ${booking.business.cancellationNoticeHours} hours in advance.`,
      422,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const action = (body as { action?: string }).action;

  /* ── Cancel ── */
  if (action === "cancel") {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });
    // Remove from calendars if synced
    deleteBookingFromGoogleCalendar(booking.business.id, booking.id).catch(() => null);
    deleteBookingFromOutlookCalendar(booking.business.id, booking.id).catch(() => null);
    return jsonOk({ ok: true, status: "CANCELLED" });
  }

  /* ── Reschedule ── */
  if (action === "reschedule") {
    const newStartsAtRaw = (body as { startsAt?: string }).startsAt;
    const newEndsAtRaw = (body as { endsAt?: string }).endsAt;

    if (!newStartsAtRaw || !newEndsAtRaw) {
      return jsonError("startsAt and endsAt are required.", 422);
    }

    const newStartsAt = new Date(newStartsAtRaw);
    const newEndsAt = new Date(newEndsAtRaw);

    if (isNaN(newStartsAt.getTime()) || isNaN(newEndsAt.getTime())) {
      return jsonError("Invalid date format.", 422);
    }

    if (newStartsAt >= newEndsAt) {
      return jsonError("Start must be before end.", 422);
    }

    const expectedMs = booking.service.durationMinutes * 60 * 1000;
    if (newEndsAt.getTime() - newStartsAt.getTime() !== expectedMs) {
      return jsonError("Duration must match the service length.", 422);
    }

    if (newStartsAt <= new Date()) {
      return jsonError("New slot must be in the future.", 422);
    }

    try {
      await prisma.$transaction(
        async (tx) => {
          const overlapping = await tx.booking.findMany({
            where: {
              businessId: booking.business.id,
              status: BookingStatus.CONFIRMED,
              id: { not: booking.id },
              startsAt: { lt: newEndsAt },
              endsAt: { gt: newStartsAt },
              ...(booking.staffMemberId
                ? {
                    OR: [
                      { staffMemberId: booking.staffMemberId },
                      { staffMemberId: null },
                    ],
                  }
                : {}),
            },
          });

          const buffer = booking.business.bookingBufferMinutes;
          const bufMs = buffer * 60 * 1000;
          const conflict = overlapping.some((r) => {
            const bStart = r.startsAt.getTime() - bufMs;
            const bEnd = r.endsAt.getTime() + bufMs;
            return newStartsAt.getTime() < bEnd && newEndsAt.getTime() > bStart;
          });

          if (conflict) throw new Error("SLOT_TAKEN");

          await tx.booking.update({
            where: { id: booking.id },
            data: { startsAt: newStartsAt, endsAt: newEndsAt },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );

      return jsonOk({
        ok: true,
        status: "CONFIRMED",
        startsAt: newStartsAt.toISOString(),
        endsAt: newEndsAt.toISOString(),
      });
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        return jsonError("That slot is no longer available.", 409);
      }
      return jsonError("Could not reschedule — please try again.", 500);
    }
  }

  return jsonError("Unknown action. Use 'cancel' or 'reschedule'.", 400);
}
