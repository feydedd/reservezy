import { getReservezySession } from "@/lib/auth/session";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import BrandingEditor from "@/components/dashboard/branding-editor";

export default async function DashboardBrandingPage() {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const isPremium = hasPremiumFeatures(ctx.subscriptionTier);

  return <BrandingEditor isPremium={isPremium} />;
}
