import { addDays, endOfMonth, startOfMonth, startOfWeek } from "date-fns";

import { BookingStatus } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { todayYmdInTimeZone } from "@/lib/dates/today-in-tz";
import { TZDate } from "@date-fns/tz";

export const dynamic = "force-dynamic";

type Period = "today" | "week" | "month" | "upcoming";

function rangeForPeriod(period: Period, tz: string): { start: Date; end: Date } {
  const now = new Date();

  if (period === "today") {
    const ymd  = todayYmdInTimeZone(tz);
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)!;
    const y = Number(matched[1]);
    const m = Number(matched[2]) - 1;
    const d = Number(matched[3]);
    const start = new TZDate(y, m, d, 0, 0, 0, 0, tz);
    const end   = new TZDate(y, m, d + 1, 0, 0, 0, 0, tz);
    return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
  }

  if (period === "week") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return { start, end: addDays(start, 7) };
  }

  if (period === "month") {
    return { start: startOfMonth(now), end: addDays(endOfMonth(now), 1) };
  }

  // upcoming — next 30 days from now
  return { start: now, end: addDays(now, 30) };
}

export async function GET(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx     = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorized.", 401);

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "today") as Period;

  if (!["today", "week", "month", "upcoming"].includes(period)) {
    return jsonError("Invalid period.", 400);
  }

  const tz    = ctx.timezone || "UTC";
  const range = rangeForPeriod(period, tz);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: ctx.businessId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      startsAt: { gte: range.start, lt: range.end },
      ...(ctx.staffMemberId ? { staffMemberId: ctx.staffMemberId } : {}),
    },
    orderBy: { startsAt: "asc" },
    select: {
      id:         true,
      startsAt:   true,
      endsAt:     true,
      status:     true,
      pricePenceSnapshot: true,
      notes:      true,
      service:     { select: { name: true } },
      customer:    { select: { fullName: true, email: true, phone: true } },
      staffMember: { select: { fullName: true } },
    },
    take: 200,
  });

  const totalRevenuePence = bookings.reduce((sum, b) => sum + b.pricePenceSnapshot, 0);

  return jsonOk({ bookings, totalRevenuePence, period, range });
}
