import Link from "next/link";
import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { prisma } from "@/lib/prisma";
import { LocationsClient } from "./locations-client";

export default async function DashboardLocationsPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const premium = hasPremiumFeatures(ctx.subscriptionTier);
  const initial = premium
    ? await prisma.businessLocation.findMany({
        where: { businessId: ctx.businessId },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Locations</h1>
        <p className="mt-1 text-sm text-rz-muted">
          Premium: add multiple sites so customers pick a location first, then book services and staff for that site.
        </p>
      </div>
      {!premium ? (
        <div className="rz-card p-6 text-sm text-rz-muted">
          Multi-location is available on the Premium plan.{" "}
          <Link href="/dashboard/subscription" className="font-semibold text-rz-accent hover:underline">
            Upgrade →
          </Link>
        </div>
      ) : (
        <LocationsClient initial={initial} />
      )}
    </div>
  );
}
