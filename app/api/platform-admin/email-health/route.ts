import { jsonError, jsonOk } from "@/lib/http/api-response";
import { getReservezySession } from "@/lib/auth/session";
import { getResend } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  if (session?.user?.role !== "SUPER_ADMIN") return jsonError("Forbidden.", 403);

  const resend = getResend();
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "";

  const status = {
    apiKeyConfigured: apiKey.length > 0,
    fromEmailConfigured: fromEmail.length > 0,
    fromEmail: fromEmail || "(not set)",
    sent: false,
    error: null as string | null,
  };

  if (!resend) {
    return jsonOk({ ...status, error: "RESEND_API_KEY is not set or empty in environment variables." });
  }

  // Send a test email to the super admin
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    return jsonOk({ ...status, error: "SUPER_ADMIN_EMAIL env var is not set — cannot send test email." });
  }

  try {
    const result = await resend.emails.send({
      from: fromEmail || "Reservezy <noreply@reservezy.com>",
      to: [superAdminEmail],
      subject: "Reservezy email health check ✓",
      html: `<div style="font-family:sans-serif;padding:24px;background:#09091a;color:#eef0f8;border-radius:12px">
        <h2 style="color:#8b86f9;margin:0 0 12px">Email is working! ✓</h2>
        <p style="color:#9aa3c2;margin:0">This test email confirms that Resend is properly configured on your Reservezy instance.</p>
        <p style="margin:16px 0 0;font-size:12px;color:#6b7499">Sent from: ${fromEmail}</p>
      </div>`,
    });

    if ("error" in result && result.error) {
      return jsonOk({ ...status, error: `Resend rejected the email: ${result.error.message}` });
    }

    return jsonOk({ ...status, sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonOk({ ...status, error: message });
  }
}
