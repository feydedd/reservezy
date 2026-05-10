import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function DELETE(): Promise<Response> {
  const session = await getReservezySession();
  if (!session?.user?.ownerId) return jsonError("Forbidden.", 403);

  await prisma.business.updateMany({
    where: { ownerId: session.user.ownerId as string },
    data: { adminGrantNote: null },
  });

  return jsonOk({ ok: true });
}
