import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return jsonError("Missing token.", 400);

  const owner = await prisma.owner.findFirst({
    where: { emailVerificationToken: token },
  });

  if (!owner) return jsonError("Invalid or already used verification link.", 410);

  await prisma.owner.update({
    where: { id: owner.id },
    data: { emailVerified: true, emailVerificationToken: null },
  });

  return jsonOk({ ok: true });
}
