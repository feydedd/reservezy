import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { dashboardBookingListQuerySchema } from "@/schemas/dashboard-bookings";

export const dynamic = "force-dynamic";

/* ── GET — list bookings ─────────────────────────────────────────────────── */
export async function GET(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorized.", 401);

  const url = new URL(request.url);
  const raw = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    serviceId: url.searchParams.get("serviceId") ?? undefined,
    staffMemberId: url.searchParams.get("staffMemberId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };

  const parsed = dashboardBookingListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("Invalid filters.", 422, parsed.error.flatten().fieldErrors);
  }

  const filters = parsed.data;

  const startsAtFilter: Prisma.DateTimeFilter = {};
  if (filters.from) startsAtFilter.gte = new Date(filters.from);
  if (filters.to)   startsAtFilter.lte = new Date(filters.to);

  const where: Prisma.BookingWhereInput = {
    businessId: ctx.businessId,
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.status    ? { status: filters.status }        : {}),
    ...(Object.keys(startsAtFilter).length ? { startsAt: startsAtFilter } : {}),
  };

  if (ctx.role === "STAFF" && ctx.staffMemberId) {
    where.OR = [{ staffMemberId: ctx.staffMemberId }, { staffMemberId: null }];
  } else if (filters.staffMemberId) {
    where.staffMemberId = filters.staffMemberId;
  }

  const rows = await prisma.booking.findMany({
    where,
    orderBy: { startsAt: "desc" },
    take: 200,
    include: {
      service:     { select: { name: true } },
      staffMember: { select: { fullName: true, id: true } },
      customer:    { select: { fullName: true, email: true, phone: true, referralToken: true } },
      businessLocation: { select: { id: true, name: true } },
    },
  });

  return jsonOk({
    bookings: rows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      notes: row.notes,
      staffNotes: row.staffNotes,
      intakeAnswersJson: row.intakeAnswersJson,
      discountPence: row.discountPence,
      pricePenceSnapshot: row.pricePenceSnapshot,
      service:     row.service,
      staffMember: row.staffMember,
      customer:    row.customer,
      businessLocation: row.businessLocation,
    })),
  });
}

/* ── POST — manually create a booking (staff/owner on behalf of customer) ── */
const createBookingSchema = z.object({
  serviceId:      z.string().cuid(),
  staffMemberId:  z.string().cuid().optional().nullable(),
  startsAt:       z.string().datetime(),
  customerName:   z.string().trim().min(1).max(120),
  customerEmail:  z.string().trim().email().max(320).transform(v => v.toLowerCase()),
  customerPhone:  z.string().trim().max(30).optional().default(""),
  notes:          z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorized.", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const { serviceId, staffMemberId, startsAt: startsAtRaw, customerName, customerEmail, customerPhone, notes } = parsed.data;

  // Verify service belongs to this business
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: ctx.businessId, isActive: true },
  });
  if (!service) return jsonError("Service not found.", 404);

  // Verify staff belongs to this business (if provided)
  if (staffMemberId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffMemberId, businessId: ctx.businessId, isActive: true },
    });
    if (!staff) return jsonError("Staff member not found.", 404);
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt   = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: { businessId_email: { businessId: ctx.businessId, email: customerEmail } },
    create: { businessId: ctx.businessId, fullName: customerName, email: customerEmail, phone: customerPhone },
    update: { fullName: customerName, phone: customerPhone || undefined },
  });

  const booking = await prisma.booking.create({
    data: {
      businessId: ctx.businessId,
      serviceId,
      staffMemberId: staffMemberId ?? null,
      customerId: customer.id,
      startsAt,
      endsAt,
      notes,
      pricePenceSnapshot: service.pricePence,
    },
    include: {
      service:     { select: { name: true } },
      staffMember: { select: { fullName: true, id: true } },
      customer:    { select: { fullName: true, email: true, phone: true } },
    },
  });

  return jsonOk({
    id: booking.id,
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    status: booking.status,
    notes: booking.notes,
    pricePenceSnapshot: booking.pricePenceSnapshot,
    service:     booking.service,
    staffMember: booking.staffMember,
    customer:    booking.customer,
  }, 201);
}
