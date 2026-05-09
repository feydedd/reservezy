import bcrypt from "bcryptjs";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Token and a new password (min 8 chars) are required.", 422);

  const owner = await prisma.owner.findFirst({
    where: {
      passwordResetToken: parsed.data.token,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!owner) return jsonError("This reset link is invalid or has expired.", 410);

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.owner.update({
    where: { id: owner.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return jsonOk({ ok: true });
}
