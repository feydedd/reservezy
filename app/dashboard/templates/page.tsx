import Link from "next/link";
import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { TemplatesClient } from "./templates-client";

export default async function DashboardTemplatesPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const premium = hasPremiumFeatures(ctx.subscriptionTier);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Template library</h1>
        <p className="mt-1 text-sm text-rz-muted">
          Starter copy for reminders and service descriptions — paste into your own emails or service blurbs.
        </p>
      </div>
      {!premium ? (
        <div className="rz-card p-6 text-sm text-rz-muted">
          The template library is included with Premium.{" "}
          <Link href="/dashboard/subscription" className="font-semibold text-rz-accent hover:underline">
            Upgrade →
          </Link>
        </div>
      ) : (
        <TemplatesClient />
      )}
    </div>
  );
}
