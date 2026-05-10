import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { prisma } from "@/lib/prisma";
import ServicesManager from "@/components/dashboard/services-manager";

export default async function DashboardServicesPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const locations = hasPremiumFeatures(ctx.subscriptionTier)
    ? await prisma.businessLocation.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <ServicesManager
      subscriptionTier={ctx.subscriptionTier}
      locations={locations}
    />
  );
}
