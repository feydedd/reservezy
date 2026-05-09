import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

function buildClient(accessToken: string, refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/dashboard/integrations/google/callback`,
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
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

export async function pushBookingToGoogleCalendar(payload: BookingCalPayload): Promise<void> {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { businessId_provider: { businessId: payload.businessId, provider: "GOOGLE" } },
  });
  if (!integration) return;

  try {
    const auth = buildClient(integration.accessToken, integration.refreshToken);
    const cal = google.calendar({ version: "v3", auth });

    const event = await cal.events.insert({
      calendarId: integration.calendarId ?? "primary",
      requestBody: {
        summary: payload.summary,
        description: payload.description,
        start: { dateTime: payload.startsAt.toISOString(), timeZone: payload.timezone },
        end: { dateTime: payload.endsAt.toISOString(), timeZone: payload.timezone },
        attendees: payload.attendeeEmail ? [{ email: payload.attendeeEmail }] : [],
      },
    });

    const eventId = event.data.id;
    if (eventId) {
      await prisma.booking.update({
        where: { id: payload.bookingId },
        data: { googleCalendarEventId: eventId },
      });
    }
  } catch (err) {
    console.error("[Google Calendar] event push failed:", err);
  }
}

export async function deleteBookingFromGoogleCalendar(businessId: string, bookingId: string): Promise<void> {
  const [integration, booking] = await Promise.all([
    prisma.calendarIntegration.findUnique({
      where: { businessId_provider: { businessId, provider: "GOOGLE" } },
    }),
    prisma.booking.findUnique({ where: { id: bookingId }, select: { googleCalendarEventId: true } }),
  ]);

  if (!integration || !booking?.googleCalendarEventId) return;

  try {
    const auth = buildClient(integration.accessToken, integration.refreshToken);
    const cal = google.calendar({ version: "v3", auth });
    await cal.events.delete({
      calendarId: integration.calendarId ?? "primary",
      eventId: booking.googleCalendarEventId,
    });
  } catch (err) {
    console.error("[Google Calendar] event delete failed:", err);
  }
}
