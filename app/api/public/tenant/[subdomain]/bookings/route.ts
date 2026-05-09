import { Prisma } from "@prisma/client";
import { BookingStatus } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import {
  publicBookingCreateSchema,
  type PublicBookingCreateInput,
} from "@/schemas/public-tenant";
import {
  sendCustomerConfirmation,
  sendOwnerNotification,
} from "@/lib/email/resend";
import { sendBookingConfirmationSms } from "@/lib/sms/twilio";
import { pushBookingToGoogleCalendar } from "@/lib/calendar/google";
import { pushBookingToOutlookCalendar } from "@/lib/calendar/outlook";

export const dynamic = "force-dynamic";

type RouteParams = { params: { subdomain: string } };

function paddedOverlap(
  slotStart: Date,
  slotEnd: Date,
  bookingStart: Date,
  bookingEnd: Date,
  bufferMinutes: number,
): boolean {
  const padMs = bufferMinutes * 60 * 1000;
  const bStart = bookingStart.getTime() - padMs;
  const bEnd = bookingEnd.getTime() + padMs;
  const s = slotStart.getTime();
  const e = slotEnd.getTime();
  return s < bEnd && e > bStart;
}

async function validateStaffAndService(
  businessId: string,
  payload: PublicBookingCreateInput,
  allowStaffSelection: boolean,
  staffCount: number,
): Promise<{ error: string; status: number } | null> {
  const staffRequired = allowStaffSelection && staffCount > 0;

  if (staffRequired && !payload.staffMemberId) {
    return { error: "Select a staff member.", status: 422 };
  }

  if (!allowStaffSelection && payload.staffMemberId) {
    return { error: "This business does not expose staff selection.", status: 422 };
  }

  if (payload.staffMemberId) {
    const staff = await prisma.staffMember.findFirst({
      where: {
        id: payload.staffMemberId,
        businessId,
        isActive: true,
      },
      include: {
        offeredServices: { select: { id: true } },
      },
    });
    if (!staff) {
      return { error: "Invalid staff member.", status: 404 };
    }
    if (!staff.offeredServices.some((s) => s.id === payload.serviceId)) {
      return {
        error: "That teammate does not perform this service.",
        status: 422,
      };
    }
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();

  let bodyUnknown: unknown;
  try {
    bodyUnknown = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = publicBookingCreateSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const payload = parsed.data;
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);

  if (!(startsAt < endsAt)) {
    return jsonError("Start time must be before end time.", 422);
  }

  const business = await prisma.business.findFirst({
    where: {
      subdomain,
      isDisabled: false,
      onboardingComplete: true,
    },
    include: {
      services: { where: { id: payload.serviceId, isActive: true } },
      staffMembers: { where: { isActive: true } },
      owner: { select: { email: true } },
    },
  });

  if (!business) {
    return jsonError("Business not found.", 404);
  }

  const hasStandardNotifications =
    business.subscriptionTier === "STANDARD" || business.subscriptionTier === "PREMIUM";

  const service = business.services[0];
  if (!service) {
    return jsonError("Service not found.", 404);
  }

  const expectedMs = service.durationMinutes * 60 * 1000;
  if (endsAt.getTime() - startsAt.getTime() !== expectedMs) {
    return jsonError("Times do not match the service duration.", 422);
  }

  const staffRule = await validateStaffAndService(
    business.id,
    payload,
    business.allowCustomerStaffSelection,
    business.staffMembers.length,
  );
  if (staffRule) {
    return jsonError(staffRule.error, staffRule.status);
  }

  try {
    const booking = await prisma.$transaction(
      async (tx) => {
        const overlapping = await tx.booking.findMany({
          where: {
            businessId: business.id,
            status: BookingStatus.CONFIRMED,
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            ...(payload.staffMemberId
              ? {
                  OR: [
                    { staffMemberId: payload.staffMemberId },
                    { staffMemberId: null },
                  ],
                }
              : {}),
          },
          select: {
            startsAt: true,
            endsAt: true,
            staffMemberId: true,
          },
        });

        const buffer = business.bookingBufferMinutes;
        const conflicts = overlapping.some((row) =>
          paddedOverlap(startsAt, endsAt, row.startsAt, row.endsAt, buffer),
        );

        if (conflicts) {
          throw new Error("SLOT_TAKEN");
        }

        const existingCustomer = await tx.customer.findFirst({
          where: {
            businessId: business.id,
            email: payload.customerEmail,
          },
        });

        const customer =
          existingCustomer !== null
            ? await tx.customer.update({
                where: { id: existingCustomer.id },
                data: {
                  fullName: payload.customerFullName,
                  phone: payload.customerPhone ?? "",
                },
              })
            : await tx.customer.create({
                data: {
                  businessId: business.id,
                  fullName: payload.customerFullName,
                  email: payload.customerEmail,
                  phone: payload.customerPhone ?? "",
                },
              });

        const created = await tx.booking.create({
          data: {
            businessId: business.id,
            serviceId: service.id,
            staffMemberId: payload.staffMemberId ?? null,
            customerId: customer.id,
            startsAt,
            endsAt,
            status: BookingStatus.CONFIRMED,
            notes: payload.notes ?? "",
            pricePenceSnapshot: service.pricePence,
          },
          select: {
            id: true,
            managementToken: true,
            startsAt: true,
            endsAt: true,
          },
        });
        return {
          ...created,
          ownerEmail: business.owner.email,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    );

    // Fire-and-forget notifications — never block the booking response
    if (hasStandardNotifications) {
      const emailPayload = {
        bookingId: booking.id,
        managementToken: booking.managementToken,
        businessName: business.name,
        businessSubdomain: business.subdomain,
        ownerEmail: booking.ownerEmail,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        pricePence: service.pricePence,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        customerFullName: payload.customerFullName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
        allowCancelReschedule: business.allowCustomerCancelReschedule,
      };
      const jobs: Promise<void>[] = [
        sendCustomerConfirmation(emailPayload),
        sendOwnerNotification(emailPayload),
      ];
      // SMS confirmation for Premium tier when customer provided a phone number
      if (business.subscriptionTier === "PREMIUM" && payload.customerPhone) {
        jobs.push(
          sendBookingConfirmationSms({
            customerName: payload.customerFullName,
            customerPhone: payload.customerPhone,
            businessName: business.name,
            serviceName: service.name,
            startTime: booking.startsAt,
            timezone: business.timezone,
          }),
        );
      }
      Promise.all(jobs).catch(() => null);

      // Calendar sync (Premium, fire-and-forget)
      if (business.subscriptionTier === "PREMIUM") {
        const calPayload = {
          businessId: business.id,
          bookingId: booking.id,
          summary: `${service.name} — ${payload.customerFullName}`,
          description: payload.notes ?? undefined,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          timezone: business.timezone,
          attendeeEmail: payload.customerEmail,
        };
        pushBookingToGoogleCalendar(calPayload).catch(() => null);
        pushBookingToOutlookCalendar(calPayload).catch(() => null);
      }
    }

    return jsonOk(
      {
        bookingId: booking.id,
        managementToken: booking.managementToken,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return jsonError(
        "That slot was just booked — pick another time.",
        409,
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Double booking prevented — try another slot.", 409);
    }
    return jsonError("Unable to complete booking.", 500);
  }
}
