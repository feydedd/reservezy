import { z } from "zod";
import bcrypt from "bcryptjs";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const updateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
  businessLocationId: z.string().cuid().nullable().optional(),
});

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!member) return jsonError("Staff member not found.", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  if (
    parsed.data.businessLocationId &&
    !hasPremiumFeatures(ctx.subscriptionTier)
  ) {
    return jsonError("Locations are a Premium feature.", 403);
  }

  if (parsed.data.businessLocationId) {
    const loc = await prisma.businessLocation.findFirst({
      where: {
        id: parsed.data.businessLocationId,
        businessId: ctx.businessId,
      },
    });
    if (!loc) {
      return jsonError("Invalid location.", 404);
    }
  }

  const { serviceIds, password, ...rest } = parsed.data;
  let passwordHash: string | undefined;
  if (password) passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.staffMember.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(passwordHash ? { passwordHash } : {}),
      ...(serviceIds !== undefined
        ? { offeredServices: { set: serviceIds.map((id) => ({ id })) } }
        : {}),
    },
    include: { offeredServices: { select: { id: true, name: true } } },
  });

  return jsonOk({ member: updated });
}

export async function DELETE(_req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!member) return jsonError("Staff member not found.", 404);

  // Soft-delete — deactivate rather than destroy data
  await prisma.staffMember.update({ where: { id: params.id }, data: { isActive: false } });
  return jsonOk({ ok: true });
}
