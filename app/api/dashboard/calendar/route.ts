import { addDays, startOfWeek } from "date-fns";
import { BookingStatus } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const url = new URL(req.url);
  const offsetWeeks = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), offsetWeeks * 7);
  const weekEnd = addDays(weekStart, 7);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: ctx.businessId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW] },
      startsAt: { gte: weekStart, lt: weekEnd },
      ...(ctx.staffMemberId
        ? { OR: [{ staffMemberId: ctx.staffMemberId }, { staffMemberId: null }] }
        : {}),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      notes: true,
      service: { select: { name: true, durationMinutes: true } },
      customer: { select: { fullName: true, email: true, phone: true } },
      staffMember: { select: { fullName: true } },
    },
  });

  return jsonOk({ bookings, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() });
}
