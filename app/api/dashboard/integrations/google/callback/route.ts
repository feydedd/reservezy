import { NextResponse } from "next/server";
import { google } from "googleapis";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/dashboard/integrations/google/callback`,
  );
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // businessId
  const error = url.searchParams.get("error");

  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/integrations`;

  if (error || !code || !state) {
    return NextResponse.redirect(`${dashboardUrl}?error=oauth_denied`);
  }

  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Get the connected account email
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();
    const accountEmail = userInfo.data.email ?? null;

    // Get default calendar ID
    const calApi = google.calendar({ version: "v3", auth: oauth2 });
    const calList = await calApi.calendarList.list({ maxResults: 1 });
    const calendarId = calList.data.items?.[0]?.id ?? "primary";

    await prisma.calendarIntegration.upsert({
      where: { businessId_provider: { businessId: state, provider: "GOOGLE" } },
      create: {
        businessId: state,
        provider: "GOOGLE",
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountEmail,
        calendarId,
      },
      update: {
        accessToken: tokens.access_token ?? "",
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountEmail,
        calendarId,
      },
    });

    return NextResponse.redirect(`${dashboardUrl}?success=google_connected`);
  } catch (err) {
    console.error("[Google OAuth] callback error:", err);
    return NextResponse.redirect(`${dashboardUrl}?error=oauth_failed`);
  }
}
