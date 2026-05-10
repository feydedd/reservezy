import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const IVR_SELECT = {
  subdomain: true,
  ivrEnabled: true,
  ivrForwardNumber: true,
  ivrManagedEnabled: true,
  ivrPhoneNumber: true,
  ivrAddOnSubscriptionId: true,
  subscriptionTier: true,
} as const;

const updateSchema = z.object({
  ivrEnabled: z.boolean().optional(),
  ivrForwardNumber: z.string().trim().max(20).nullable().optional(),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: IVR_SELECT,
  });

  if (!business) return jsonError("Business not found.", 404);
  return jsonOk(business);
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request.", 400);

  const { ivrEnabled, ivrForwardNumber } = parsed.data;

  const updated = await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ...(ivrEnabled !== undefined && { ivrEnabled }),
      ...(ivrForwardNumber !== undefined && { ivrForwardNumber }),
    },
    select: IVR_SELECT,
  });

  return jsonOk(updated);
}
