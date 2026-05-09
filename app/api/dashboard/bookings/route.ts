import type { Prisma } from "@prisma/client";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { dashboardBookingListQuerySchema } from "@/schemas/dashboard-bookings";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    return jsonError("Unauthorized.", 401);
  }

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
  if (filters.from) {
    startsAtFilter.gte = new Date(filters.from);
  }
  if (filters.to) {
    startsAtFilter.lte = new Date(filters.to);
  }

  const where: Prisma.BookingWhereInput = {
    businessId: ctx.businessId,
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(Object.keys(startsAtFilter).length ? { startsAt: startsAtFilter } : {}),
  };

  if (ctx.role === "STAFF" && ctx.staffMemberId) {
    where.OR = [
      { staffMemberId: ctx.staffMemberId },
      { staffMemberId: null },
    ];
  } else if (filters.staffMemberId) {
    where.staffMemberId = filters.staffMemberId;
  }

  const rows = await prisma.booking.findMany({
    where,
    orderBy: { startsAt: "desc" },
    take: 200,
    include: {
      service: { select: { name: true } },
      staffMember: { select: { fullName: true, id: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
    },
  });

  return jsonOk({
    bookings: rows.map((row) => ({
      id: row.id,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      status: row.status,
      notes: row.notes,
      pricePenceSnapshot: row.pricePenceSnapshot,
      service: row.service,
      staffMember: row.staffMember,
      customer: row.customer,
    })),
  });
}
