import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  primaryColour: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  secondaryColour: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  googleFontFamily: z.string().max(80).nullable().optional(),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const branding = await prisma.branding.findUnique({
    where: { businessId: ctx.businessId },
  });

  return jsonOk({ branding });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Custom branding requires a Premium plan.", 403);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const branding = await prisma.branding.upsert({
    where: { businessId: ctx.businessId },
    create: { businessId: ctx.businessId, ...parsed.data },
    update: parsed.data,
  });

  return jsonOk({ branding });
}
