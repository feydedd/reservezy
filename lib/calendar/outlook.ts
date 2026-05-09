import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";

async function refreshOutlookToken(integration: {
  refreshToken: string;
  businessId: string;
}): Promise<string> {
  const tenantId = process.env.AZURE_AD_TENANT_ID ?? "common";
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: integration.refreshToken,
      grant_type: "refresh_token",
      scope: "Calendars.ReadWrite offline_access",
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  const tokens = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };

  await prisma.calendarIntegration.update({
    where: { businessId_provider: { businessId: integration.businessId, provider: "MICROSOFT_OUTLOOK" } },
    data: {
      accessToken: tokens.access_token,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

function buildClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

type BookingCalPayload = {
  businessId: string;
  bookingId: string;
  summary: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  attendeeEmail?: string;
};

export async function pushBookingToOutlookCalendar(payload: BookingCalPayload): Promise<void> {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { businessId_provider: { businessId: payload.businessId, provider: "MICROSOFT_OUTLOOK" } },
  });
  if (!integration) return;

  try {
    let token = integration.accessToken;
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      token = await refreshOutlookToken({ refreshToken: integration.refreshToken, businessId: payload.businessId });
    }

    const client = buildClient(token);
    const event = await client.api("/me/events").post({
      subject: payload.summary,
      body: { contentType: "text", content: payload.description ?? "" },
      start: { dateTime: payload.startsAt.toISOString(), timeZone: payload.timezone },
      end: { dateTime: payload.endsAt.toISOString(), timeZone: payload.timezone },
      attendees: payload.attendeeEmail
        ? [{ emailAddress: { address: payload.attendeeEmail }, type: "required" }]
        : [],
    }) as { id?: string };

    if (event?.id) {
      await prisma.booking.update({
        where: { id: payload.bookingId },
        data: { microsoftEventId: event.id },
      });
    }
  } catch (err) {
    console.error("[Outlook Calendar] event push failed:", err);
  }
}

export async function deleteBookingFromOutlookCalendar(businessId: string, bookingId: string): Promise<void> {
  const [integration, booking] = await Promise.all([
    prisma.calendarIntegration.findUnique({
      where: { businessId_provider: { businessId, provider: "MICROSOFT_OUTLOOK" } },
    }),
    prisma.booking.findUnique({ where: { id: bookingId }, select: { microsoftEventId: true } }),
  ]);

  if (!integration || !booking?.microsoftEventId) return;

  try {
    let token = integration.accessToken;
    if (integration.expiresAt && integration.expiresAt < new Date()) {
      token = await refreshOutlookToken({ refreshToken: integration.refreshToken, businessId });
    }
    const client = buildClient(token);
    await client.api(`/me/events/${booking.microsoftEventId}`).delete();
  } catch (err) {
    console.error("[Outlook Calendar] event delete failed:", err);
  }
}
