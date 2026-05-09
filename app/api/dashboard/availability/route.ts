import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openMinutes: z.number().int().min(0).max(1439),
  closeMinutes: z.number().int().min(1).max(1440),
});

const updateSchema = z.object({
  workingHours: z.array(workingHourSchema),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  timezone: z.string().max(50).optional(),
});

export async function GET(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);

  const staffId = new URL(req.url).searchParams.get("staffId") ?? null;

  const [workingHours, holidays, business] = await Promise.all([
    prisma.workingHours.findMany({
      where: { businessId: ctx.businessId, staffMemberId: staffId },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.holidayDate.findMany({
      where: { businessId: ctx.businessId, staffMemberId: staffId },
      orderBy: { dateStart: "asc" },
    }),
    prisma.business.findUnique({
      where: { id: ctx.businessId },
      select: { bookingBufferMinutes: true, timezone: true },
    }),
  ]);

  return jsonOk({ workingHours, holidays, business });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const staffId = new URL(req.url).searchParams.get("staffId") ?? null;

  // Verify staff belongs to this business
  if (staffId) {
    const staff = await prisma.staffMember.findFirst({ where: { id: staffId, businessId: ctx.businessId } });
    if (!staff) return jsonError("Staff member not found.", 404);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  await prisma.$transaction(async (tx) => {
    await tx.workingHours.deleteMany({
      where: { businessId: ctx.businessId, staffMemberId: staffId },
    });
    if (parsed.data.workingHours.length) {
      await tx.workingHours.createMany({
        data: parsed.data.workingHours.map((h) => ({
          businessId: ctx.businessId,
          staffMemberId: staffId,
          dayOfWeek: h.dayOfWeek,
          openMinutes: h.openMinutes,
          closeMinutes: h.closeMinutes,
        })),
      });
    }
    if (parsed.data.bufferMinutes !== undefined || parsed.data.timezone !== undefined) {
      await tx.business.update({
        where: { id: ctx.businessId },
        data: {
          ...(parsed.data.bufferMinutes !== undefined
            ? { bookingBufferMinutes: parsed.data.bufferMinutes }
            : {}),
          ...(parsed.data.timezone ? { timezone: parsed.data.timezone } : {}),
        },
      });
    }
  });

  return jsonOk({ ok: true });
}
