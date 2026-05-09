import { z } from "zod";
import bcrypt from "bcryptjs";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  if (ctx.role === "BUSINESS_OWNER") {
    const owner = await prisma.owner.findUnique({
      where: { id: ctx.ownerId! },
      select: { id: true, fullName: true, email: true },
    });
    return jsonOk({ user: owner, role: "BUSINESS_OWNER" });
  }

  const staff = await prisma.staffMember.findUnique({
    where: { id: ctx.staffMemberId! },
    select: { id: true, fullName: true, email: true },
  });
  return jsonOk({ user: staff, role: "STAFF" });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const { fullName, currentPassword, newPassword } = parsed.data;

  if (ctx.role === "BUSINESS_OWNER") {
    const owner = await prisma.owner.findUnique({ where: { id: ctx.ownerId! } });
    if (!owner) return jsonError("Owner not found.", 404);

    if (newPassword) {
      if (!currentPassword) return jsonError("Current password is required.", 422);
      const valid = await bcrypt.compare(currentPassword, owner.passwordHash);
      if (!valid) return jsonError("Current password is incorrect.", 401);
    }

    const updated = await prisma.owner.update({
      where: { id: owner.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
      },
      select: { id: true, fullName: true, email: true },
    });
    return jsonOk({ user: updated });
  }

  // Staff
  const staff = await prisma.staffMember.findUnique({ where: { id: ctx.staffMemberId! } });
  if (!staff) return jsonError("Staff not found.", 404);

  if (newPassword) {
    if (!currentPassword) return jsonError("Current password is required.", 422);
    if (!staff.passwordHash) return jsonError("No password set — contact your owner.", 422);
    const valid = await bcrypt.compare(currentPassword, staff.passwordHash);
    if (!valid) return jsonError("Current password is incorrect.", 401);
  }

  const updated = await prisma.staffMember.update({
    where: { id: staff.id },
    data: {
      ...(fullName ? { fullName } : {}),
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
    },
    select: { id: true, fullName: true, email: true },
  });
  return jsonOk({ user: updated });
}
