import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const tenantId = process.env.AZURE_AD_TENANT_ID ?? "common";
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // businessId
  const error = url.searchParams.get("error");

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const dashboardUrl = `${base}/dashboard/integrations`;
  const redirectUri = `${base}/api/dashboard/integrations/outlook/callback`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${dashboardUrl}?error=oauth_denied`);
  }

  try {
    const tokens = await exchangeCode(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get user email from Graph
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = (await meRes.json()) as { mail?: string; userPrincipalName?: string };
    const accountEmail = me.mail ?? me.userPrincipalName ?? null;

    await prisma.calendarIntegration.upsert({
      where: { businessId_provider: { businessId: state, provider: "MICROSOFT_OUTLOOK" } },
      create: {
        businessId: state,
        provider: "MICROSOFT_OUTLOOK",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        accountEmail,
        calendarId: null,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        accountEmail,
      },
    });

    return NextResponse.redirect(`${dashboardUrl}?success=outlook_connected`);
  } catch (err) {
    console.error("[Outlook OAuth] callback error:", err);
    return NextResponse.redirect(`${dashboardUrl}?error=oauth_failed`);
  }
}
