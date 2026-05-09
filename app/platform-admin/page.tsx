import { BookingStatus } from "@prisma/client";
import { subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import BusinessManager from "@/components/platform-admin/business-manager";

async function loadMetrics() {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [totalBusinesses, activeBusinesses, totalBookings30d, confirmedBookings30d, revenueRows, tierCounts] =
    await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { isDisabled: false, onboardingComplete: true } }),
      prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.count({
        where: { createdAt: { gte: thirtyDaysAgo }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      }),
      prisma.booking.aggregate({
        _sum: { pricePenceSnapshot: true },
        where: { createdAt: { gte: thirtyDaysAgo }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      }),
      prisma.business.groupBy({ by: ["subscriptionTier"], _count: { subscriptionTier: true } }),
    ]);

  const grossRevenuePence = revenueRows._sum.pricePenceSnapshot ?? 0;
  const tierMap = Object.fromEntries(tierCounts.map((r) => [r.subscriptionTier, r._count.subscriptionTier])) as Record<string, number>;

  // Estimate MRR: STANDARD × £29.99 + PREMIUM × £49.99
  const mrr = ((tierMap.STANDARD ?? 0) * 2999) + ((tierMap.PREMIUM ?? 0) * 4999);

  return { total: totalBusinesses, active: activeBusinesses, totalBookings30d, confirmedBookings30d, grossRevenuePence, mrr };
}

export default async function PlatformAdminPage() {
  const stats = await loadMetrics();

  return (
    <BusinessManager
      initialStats={{ total: stats.total, active: stats.active, mrr: stats.mrr }}
    />
  );
}
