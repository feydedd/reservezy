import {
  addDays,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { BookingStatus } from "@prisma/client";

import { todayYmdInTimeZone } from "@/lib/dates/today-in-tz";
import type { DashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { TZDate } from "@date-fns/tz";

function ymdParts(ymd: string): { y: number; m: number; d: number } | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!matched) {
    return null;
  }
  return {
    y: Number(matched[1]),
    m: Number(matched[2]) - 1,
    d: Number(matched[3]),
  };
}

function rangeForYmd(ymd: string, timeZone: string): { start: Date; end: Date } {
  const parts = ymdParts(ymd);
  if (!parts) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return { start: fallback, end: addDays(fallback, 1) };
  }
  const start = new TZDate(parts.y, parts.m, parts.d, 0, 0, 0, 0, timeZone);
  const end = new TZDate(parts.y, parts.m, parts.d + 1, 0, 0, 0, 0, timeZone);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

export async function loadDashboardStats(ctx: DashboardBusinessContext) {
  const tz = ctx.timezone || "UTC";
  const todayYmd = todayYmdInTimeZone(tz);
  const todayRange = rangeForYmd(todayYmd, tz);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 7);

  const monthStart = startOfMonth(new Date());
  const monthEnd = addDays(endOfMonth(new Date()), 1);

  const bookingWhereBase = {
    businessId: ctx.businessId,
    status: {
      in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] as BookingStatus[],
    },
    ...(ctx.staffMemberId ? { staffMemberId: ctx.staffMemberId } : {}),
  };

  const [
    todayCount,
    weekCount,
    monthCount,
    upcomingCount,
    revenueAgg,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        ...bookingWhereBase,
        startsAt: { gte: todayRange.start, lt: todayRange.end },
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhereBase,
        startsAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhereBase,
        startsAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhereBase,
        startsAt: { gte: new Date() },
      },
    }),
    prisma.booking.aggregate({
      where: {
        businessId: ctx.businessId,
        status: BookingStatus.CONFIRMED,
        startsAt: { gte: monthStart, lt: monthEnd },
        ...(ctx.staffMemberId ? { staffMemberId: ctx.staffMemberId } : {}),
      },
      _sum: { pricePenceSnapshot: true },
    }),
  ]);

  return {
    bookingsToday: todayCount,
    bookingsThisWeek: weekCount,
    bookingsThisMonth: monthCount,
    upcomingBookings: upcomingCount,
    revenueThisMonthPence: revenueAgg._sum.pricePenceSnapshot ?? 0,
  };
}
