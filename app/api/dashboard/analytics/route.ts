/**
 * GET /api/dashboard/analytics?days=30
 * Returns booking + revenue time-series data for charts.
 * Scoped to the authenticated owner's business.
 */

import { BookingStatus } from "@prisma/client";
import { subDays, format, startOfDay } from "date-fns";

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
  const days = Math.min(Number(url.searchParams.get("days") ?? "30"), 90);
  const since = subDays(startOfDay(new Date()), days - 1);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId: ctx.businessId,
      startsAt: { gte: since },
      ...(ctx.staffMemberId ? { staffMemberId: ctx.staffMemberId } : {}),
    },
    select: {
      startsAt: true,
      status: true,
      pricePenceSnapshot: true,
      service: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Build daily buckets
  const bucketMap = new Map<string, { date: string; bookings: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    const d = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
    bucketMap.set(d, { date: d, bookings: 0, revenue: 0 });
  }

  for (const b of bookings) {
    const d = format(b.startsAt, "yyyy-MM-dd");
    const bucket = bucketMap.get(d);
    if (!bucket) continue;
    bucket.bookings += 1;
    if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) {
      bucket.revenue += b.pricePenceSnapshot;
    }
  }

  const daily = Array.from(bucketMap.values());

  // Service breakdown
  const serviceCounts = new Map<string, number>();
  for (const b of bookings) {
    const name = b.service.name;
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const byService = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Summary
  const confirmed = bookings.filter(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED,
  );
  const totalRevenuePence = confirmed.reduce((s, b) => s + b.pricePenceSnapshot, 0);

  return jsonOk({
    daily,
    byService,
    summary: {
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
      totalRevenuePence,
      days,
    },
  });
}
