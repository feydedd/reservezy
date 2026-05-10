import { z } from "zod";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().trim().min(2).max(32),
  percentOff: z.number().int().min(1).max(100).optional(),
  amountOffPence: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
}).refine(
  (v) =>
    (v.percentOff !== undefined && v.amountOffPence === undefined) ||
    (v.percentOff === undefined && v.amountOffPence !== undefined),
  { message: "Set either percentOff or amountOffPence (not both)." },
);

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const rows = await prisma.promoCode.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ promoCodes: rows });
}

export async function POST(request: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
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

  const codeNorm = parsed.data.code.toUpperCase();
  const expiresAt =
    parsed.data.expiresAt === undefined
      ? undefined
      : parsed.data.expiresAt === null
        ? null
        : new Date(parsed.data.expiresAt);

  try {
    const created = await prisma.promoCode.create({
      data: {
        businessId: ctx.businessId,
        code: codeNorm,
        percentOff: parsed.data.percentOff ?? null,
        amountOffPence: parsed.data.amountOffPence ?? null,
        active: parsed.data.active ?? true,
        expiresAt,
        maxUses: parsed.data.maxUses ?? null,
      },
    });
    return jsonOk({ promoCode: created }, 201);
  } catch {
    return jsonError("Could not create code (duplicate?).", 409);
  }
}
