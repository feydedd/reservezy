import Link from "next/link";
import { getReservezySession } from "@/lib/auth/session";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { prisma } from "@/lib/prisma";
import { ReviewsClient } from "./reviews-client";

export default async function DashboardReviewsPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const premium = hasPremiumFeatures(ctx.subscriptionTier);
  const settings = premium
    ? await prisma.business.findUnique({
        where: { id: ctx.businessId },
        select: { reviewPromptEnabled: true, reviewUrl: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Review prompts</h1>
        <p className="mt-1 text-sm text-rz-muted">
          After a visit is marked complete, we can email customers a link to leave a public review (Premium).
        </p>
      </div>
      {!premium ? (
        <div className="rz-card p-6 text-sm text-rz-muted">
          Review prompts are a Premium feature.{" "}
          <Link href="/dashboard/subscription" className="font-semibold text-rz-accent hover:underline">
            Upgrade →
          </Link>
        </div>
      ) : (
        <ReviewsClient
          initialEnabled={settings?.reviewPromptEnabled ?? false}
          initialUrl={settings?.reviewUrl ?? ""}
        />
      )}
    </div>
  );
}
