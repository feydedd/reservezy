import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
});

export async function PATCH(request: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const row = await prisma.promoCode.findFirst({
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

  const expiresAt =
    parsed.data.expiresAt === undefined
      ? undefined
      : parsed.data.expiresAt === null
        ? null
        : new Date(parsed.data.expiresAt);

  const updated = await prisma.promoCode.update({
    where: { id: row.id },
    data: {
      ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(parsed.data.maxUses !== undefined ? { maxUses: parsed.data.maxUses } : {}),
    },
  });

  return jsonOk({ promoCode: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const row = await prisma.promoCode.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!row) {
    return jsonError("Not found.", 404);
  }

  await prisma.promoCode.delete({ where: { id: row.id } });
  return jsonOk({ ok: true });
}
