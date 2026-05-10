import twilio from "twilio";

import { normalisePhone, isE164 } from "@/lib/phone/normalise";

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  _client = twilio(sid, token);
  return _client;
}

const FROM = process.env.TWILIO_FROM_NUMBER ?? "";

type BookingPayload = {
  customerName: string;
  customerPhone: string;
  businessName: string;
  serviceName: string;
  startTime: Date;
  timezone: string;
};

function formatLocal(date: Date, timezone: string) {
  return date.toLocaleString("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ensures the phone number is in E.164 before passing to Twilio.
 * Returns null if the number cannot be normalised to a plausible format.
 */
function preparePhone(raw: string): string | null {
  if (!raw) return null;
  const normalised = normalisePhone(raw);
  if (!isE164(normalised)) {
    console.warn("[SMS] Phone number could not be normalised to E.164:", raw, "→", normalised, "— skipping SMS.");
    return null;
  }
  return normalised;
}

export async function sendBookingConfirmationSms(payload: BookingPayload): Promise<void> {
  const client = getClient();
  if (!client || !FROM) {
    console.log("[SMS] Twilio not configured — skipping confirmation SMS.");
    return;
  }

  const to = preparePhone(payload.customerPhone);
  if (!to) return;

  const dateStr = formatLocal(payload.startTime, payload.timezone);
  const body = `Hi ${payload.customerName.split(" ")[0]}! Your ${payload.serviceName} at ${payload.businessName} is confirmed for ${dateStr}. See you then!`;

  try {
    await client.messages.create({ to, from: FROM, body });
  } catch (err) {
    // Log the Twilio error code if available for easier diagnosis
    const twilioErr = err as { code?: number; message?: string };
    console.error(`[SMS] Confirmation send failed to ${to} (Twilio code ${twilioErr.code ?? "?"}):`, twilioErr.message ?? err);
  }
}

export async function sendBookingReminderSms(payload: BookingPayload): Promise<void> {
  const client = getClient();
  if (!client || !FROM) {
    console.log("[SMS] Twilio not configured — skipping reminder SMS.");
    return;
  }

  const to = preparePhone(payload.customerPhone);
  if (!to) return;

  const dateStr = formatLocal(payload.startTime, payload.timezone);
  const body = `Reminder: ${payload.serviceName} at ${payload.businessName} — ${dateStr}. See you soon!`;

  try {
    await client.messages.create({ to, from: FROM, body });
  } catch (err) {
    const twilioErr = err as { code?: number; message?: string };
    console.error(`[SMS] Reminder send failed to ${to} (Twilio code ${twilioErr.code ?? "?"}):`, twilioErr.message ?? err);
  }
}
