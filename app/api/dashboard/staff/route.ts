import { z } from "zod";
import bcrypt from "bcryptjs";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  serviceIds: z.array(z.string()).optional().default([]),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const staff = await prisma.staffMember.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "asc" },
    include: { offeredServices: { select: { id: true, name: true } } },
  });

  return jsonOk({ staff });
}

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const existing = await prisma.staffMember.findFirst({
    where: { businessId: ctx.businessId, email: parsed.data.email },
  });
  if (existing) return jsonError("A staff member with that email already exists.", 409);

  let passwordHash: string | undefined;
  if (parsed.data.password) {
    passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  const member = await prisma.staffMember.create({
    data: {
      businessId: ctx.businessId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      passwordHash: passwordHash ?? null,
      offeredServices: parsed.data.serviceIds.length
        ? { connect: parsed.data.serviceIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { offeredServices: { select: { id: true, name: true } } },
  });

  return jsonOk({ member }, 201);
}
