import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  durationMinutes: z.number().int().min(5).max(480),
  pricePence: z.number().int().min(0),
  isActive: z.boolean().optional().default(true),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const services = await prisma.service.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { sortOrder: "asc" },
  });

  return jsonOk({ services });
}

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const maxOrder = await prisma.service.aggregate({
    _max: { sortOrder: true },
    where: { businessId: ctx.businessId },
  });

  const service = await prisma.service.create({
    data: {
      businessId: ctx.businessId,
      ...parsed.data,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return jsonOk({ service }, 201);
}
