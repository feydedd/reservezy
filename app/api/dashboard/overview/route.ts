import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { loadDashboardStats } from "@/lib/server/dashboard-stats";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) {
    return jsonError("Unauthorized.", 401);
  }

  const stats = await loadDashboardStats(ctx);

  return jsonOk({
    business: {
      name: ctx.businessName,
      subdomain: ctx.subdomain,
      timezone: ctx.timezone,
      tier: ctx.subscriptionTier,
      subscriptionStatus: ctx.subscriptionStatus,
    },
    role: ctx.role,
    stats,
  });
}
