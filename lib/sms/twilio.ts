import twilio from "twilio";

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

export async function sendBookingConfirmationSms(payload: BookingPayload): Promise<void> {
  const client = getClient();
  if (!client || !FROM) {
    console.log("[SMS] Twilio not configured — skipping confirmation SMS.");
    return;
  }

  const dateStr = formatLocal(payload.startTime, payload.timezone);
  const body =
    `Hi ${payload.customerName}! Your booking for "${payload.serviceName}" at ${payload.businessName} is confirmed for ${dateStr}. See you then! — Reservezy`;

  try {
    await client.messages.create({ to: payload.customerPhone, from: FROM, body });
  } catch (err) {
    console.error("[SMS] Confirmation send failed:", err);
  }
}

export async function sendBookingReminderSms(payload: BookingPayload): Promise<void> {
  const client = getClient();
  if (!client || !FROM) {
    console.log("[SMS] Twilio not configured — skipping reminder SMS.");
    return;
  }

  const dateStr = formatLocal(payload.startTime, payload.timezone);
  const body =
    `Reminder: "${payload.serviceName}" at ${payload.businessName} is tomorrow — ${dateStr}. See you soon! — Reservezy`;

  try {
    await client.messages.create({ to: payload.customerPhone, from: FROM, body });
  } catch (err) {
    console.error("[SMS] Reminder send failed:", err);
  }
}
