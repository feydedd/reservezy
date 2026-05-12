/**
 * POST /api/dashboard/ivr/checkout
 * Legacy: managed phone IVR is included in every plan — provisioning is via
 * /api/dashboard/ivr/provision or automatically after subscription checkout.
 */
import { jsonError } from "@/lib/http/api-response";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }
  await req.json().catch(() => null);
  return jsonError(
    "Managed phone IVR is included in every plan. Open Phone IVR in the dashboard and choose Get my number — no separate checkout.",
    400,
  );
}
