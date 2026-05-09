import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type RouteParams = { params: { id: string } };

const patchSchema = z.object({ isDisabled: z.boolean() });

export async function PATCH(req: Request, { params }: RouteParams): Promise<Response> {
  const session = await getReservezySession();
  if (session?.user?.role !== "SUPER_ADMIN") return jsonError("Forbidden.", 403);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid payload.", 422);

  const updated = await prisma.business.update({
    where: { id: params.id },
    data: { isDisabled: parsed.data.isDisabled },
    select: { id: true, isDisabled: true, name: true },
  });

  return jsonOk({ business: updated });
}
