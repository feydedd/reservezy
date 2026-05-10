import crypto from "crypto";

import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

const FROM = process.env.RESEND_FROM_EMAIL ?? "Reservezy <noreply@reservezy.com>";

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("A valid email is required.", 422);

  const owner = await prisma.owner.findUnique({ where: { email: parsed.data.email } });

  // Always respond OK to prevent user enumeration
  if (!owner) return jsonOk({ ok: true });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.owner.update({
    where: { id: owner.id },
    data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${base}/reset-password/${token}`;

  const resend = getResend();
  if (!resend) {
    // Email is not configured — still return ok to avoid user enumeration,
    // but log clearly so it's visible in Vercel Function logs.
    console.error("[forgot-password] RESEND_API_KEY is not set — password reset email NOT sent to", owner.email);
    return jsonOk({ ok: true });
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: [owner.email],
      subject: "Reset your Reservezy password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09091a;color:#eef0f8;border-radius:16px">
          <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 8px">Reset your password</h2>
          <p style="color:#9aa3c2;margin:0 0 24px">Hi ${owner.fullName}, click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b86f9,#6d66f0);color:#fff;font-weight:600;padding:14px 28px;border-radius:999px;text-decoration:none">
            Reset password →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#6b7499">If you didn&apos;t request this, you can safely ignore it. Your password won&apos;t change.</p>
        </div>`,
    });

    if ("error" in result && result.error) {
      console.error("[forgot-password] Resend rejected the email:", result.error.message, "| from:", FROM, "| to:", owner.email);
    }
  } catch (err) {
    console.error("[forgot-password] email send exception:", err);
  }

  return jsonOk({ ok: true });
}
