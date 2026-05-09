import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

export async function DELETE(_req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  try { requireBusinessOwner(ctx); } catch { return jsonError("Forbidden.", 403); }

  const holiday = await prisma.holidayDate.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
  });
  if (!holiday) return jsonError("Holiday not found.", 404);

  await prisma.holidayDate.delete({ where: { id: params.id } });
  return jsonOk({ ok: true });
}
