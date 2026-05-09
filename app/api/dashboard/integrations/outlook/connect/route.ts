import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Calendar sync requires a Premium plan.", 403);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.AZURE_AD_TENANT_ID ?? "common";
  if (!clientId) return jsonError("Microsoft OAuth not configured.", 503);

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${base}/api/dashboard/integrations/outlook/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "Calendars.ReadWrite User.Read offline_access",
    state: ctx.businessId,
    prompt: "consent",
  });

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  return jsonOk({ url });
}
