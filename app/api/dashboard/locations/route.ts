import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";
import { hasPremiumFeatures } from "@/lib/subscription/tiers";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export async function GET(): Promise<Response> {
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

  const rows = await prisma.businessLocation.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({ locations: rows });
}

export async function POST(request: Request): Promise<Response> {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const maxSort = await prisma.businessLocation.aggregate({
    where: { businessId: ctx.businessId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

  const created = await prisma.businessLocation.create({
    data: {
      businessId: ctx.businessId,
      name: parsed.data.name,
      sortOrder,
    },
  });

  return jsonOk({ location: created }, 201);
}
