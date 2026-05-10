import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Locations are a Premium feature.", 403);
  }

  const row = await prisma.businessLocation.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!row) {
    return jsonError("Not found.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.businessLocation.update({
    where: { id: row.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
    },
  });

  return jsonOk({ location: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  if (!hasPremiumFeatures(ctx.subscriptionTier)) {
    return jsonError("Locations are a Premium feature.", 403);
  }

  const row = await prisma.businessLocation.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!row) {
    return jsonError("Not found.", 404);
  }

  await prisma.businessLocation.delete({ where: { id: row.id } });
  return jsonOk({ ok: true });
}
