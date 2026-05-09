import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  allowCustomerStaffSelection: z.boolean().optional(),
  allowCustomerCancelReschedule: z.boolean().optional(),
  cancellationNoticeHours: z.number().int().min(0).max(168).optional(),
  bookingBufferMinutes: z.number().int().min(0).max(120).optional(),
  slotMode: z.enum(["FIXED", "FLEXIBLE"]).optional(),
});

export async function GET(): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      allowCustomerStaffSelection: true,
      allowCustomerCancelReschedule: true,
      cancellationNoticeHours: true,
      bookingBufferMinutes: true,
      slotMode: true,
    },
  });

  return jsonOk({ settings: business });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const updated = await prisma.business.update({
    where: { id: ctx.businessId },
    data: parsed.data,
    select: {
      allowCustomerStaffSelection: true,
      allowCustomerCancelReschedule: true,
      cancellationNoticeHours: true,
      bookingBufferMinutes: true,
      slotMode: true,
    },
  });

  return jsonOk({ settings: updated });
}
