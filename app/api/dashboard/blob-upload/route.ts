import { put } from "@vercel/blob";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("File uploads require a Premium plan.", 403);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return jsonError("Only image files are accepted.", 415);
  }

  const ext = contentType.split("/")[1]?.split(";")[0] ?? "png";
  const filename = `logos/${ctx.businessId}.${ext}`;

  const blob = await put(filename, req.body as ReadableStream, {
    access: "public",
    contentType,
  });

  return jsonOk({ url: blob.url });
}
