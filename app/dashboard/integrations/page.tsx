import { getReservezySession } from "@/lib/auth/session";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import IntegrationsPanel from "@/components/dashboard/integrations-panel";

export default async function DashboardIntegrationsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  requireBusinessOwner(ctx);

  const isPremium = hasPremiumFeatures(ctx.subscriptionTier);

  const integrations = isPremium
    ? await prisma.calendarIntegration.findMany({
        where: { businessId: ctx.businessId },
        select: { provider: true, accountEmail: true, calendarId: true, expiresAt: true },
      })
    : [];

  const googleIntegration = integrations.find((i) => i.provider === "GOOGLE") ?? null;
  const outlookIntegration = integrations.find((i) => i.provider === "MICROSOFT_OUTLOOK") ?? null;

  return (
    <IntegrationsPanel
      isPremium={isPremium}
      googleIntegration={googleIntegration ? { accountEmail: googleIntegration.accountEmail ?? null, calendarId: googleIntegration.calendarId ?? null } : null}
      outlookIntegration={outlookIntegration ? { accountEmail: outlookIntegration.accountEmail ?? null } : null}
      flashSuccess={searchParams.success}
      flashError={searchParams.error}
    />
  );
}
