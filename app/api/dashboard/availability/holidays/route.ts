import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().max(100).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);

  const holiday = await prisma.holidayDate.create({
    data: {
      businessId: ctx.businessId,
      staffMemberId: null,
      dateStart: new Date(parsed.data.dateStart),
      label: parsed.data.label ?? "",
    },
  });

  return jsonOk({ holiday }, 201);
}
