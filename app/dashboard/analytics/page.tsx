import Link from "next/link";

import { getReservezySession } from "@/lib/auth/session";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { subDays, format } from "date-fns";

async function loadAnalytics(businessId: string, days: number) {
  const since = subDays(new Date(), days - 1);

  const bookings = await prisma.booking.findMany({
    where: { businessId, startsAt: { gte: since } },
    select: {
      startsAt: true,
      status: true,
      pricePenceSnapshot: true,
      service: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

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

  const serviceCounts = new Map<string, number>();
  for (const b of bookings) {
    const n = b.service.name;
    serviceCounts.set(n, (serviceCounts.get(n) ?? 0) + 1);
  }

  const confirmed = bookings.filter(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED,
  );

  return {
    daily: Array.from(bucketMap.values()),
    byService: Array.from(serviceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    summary: {
      totalBookings: bookings.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length,
      totalRevenuePence: confirmed.reduce((s, b) => s + b.pricePenceSnapshot, 0),
      days,
    },
  };
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: { days?: string };
}) {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const premium = hasPremiumFeatures(ctx.subscriptionTier);

  if (!premium) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">Analytics</h1>
        <div className="rz-card p-8 text-center">
          <p className="text-4xl">📊</p>
          <h2 className="mt-4 text-xl font-bold text-white">Advanced analytics on Premium</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-rz-muted">
            Unlock booking charts, revenue graphs, and service breakdowns by upgrading to Premium.
          </p>
          <Link href="/dashboard/subscription" className="rz-btn-primary mt-6 inline-flex">
            Upgrade to Premium →
          </Link>
        </div>
      </div>
    );
  }

  const days = Math.min(Math.max(Number(searchParams?.days ?? "30"), 7), 90);
  const data = await loadAnalytics(ctx.businessId, days);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-rz-muted">
            Last {days} days · {ctx.businessName}
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/dashboard/analytics?days=${d}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                d === days
                  ? "bg-rz-accent text-white"
                  : "border border-white/15 text-rz-muted hover:text-white"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsCharts data={data} />
    </div>
  );
}
