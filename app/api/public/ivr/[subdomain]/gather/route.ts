/**
 * POST /api/public/ivr/[subdomain]/gather
 *
 * Twilio posts here after the caller presses a key.
 * Digits=1 → send booking link SMS to caller, hang up.
 * Digits=2 (or anything else) → dial the business forward number.
 */
import twilio from "twilio";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function twiml(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { subdomain: string } },
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();

  const business = await prisma.business.findFirst({
    where: { subdomain, isDisabled: false, ivrEnabled: true },
    select: { name: true, subdomain: true, ivrForwardNumber: true },
  });

  if (!business) {
    return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Say>Configuration error. Goodbye.</Say><Hangup/></Response>`);
  }

  const forwardBlock = business.ivrForwardNumber
    ? `<Dial>${business.ivrForwardNumber}</Dial>`
    : `<Say>I'm sorry, we're unable to connect your call right now. Please visit our booking page online. Goodbye.</Say><Hangup/>`;

  // Parse the form body Twilio sends
  const body   = await req.text();
  const params2 = new URLSearchParams(body);
  const digits = params2.get("Digits") ?? "";
  const caller = params2.get("From")   ?? "";

  if (digits === "1") {
    // Try to send booking link SMS to the caller
    const bookingUrl = `https://${business.subdomain}.reservezy.com`;
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_FROM_NUMBER;

    if (sid && token && from && caller) {
      try {
        const client = twilio(sid, token);
        await client.messages.create({
          from,
          to: caller,
          body: `Here's the online booking link for ${business.name}: ${bookingUrl} — book any time, 24/7.`,
        });
      } catch (err) {
        console.error("[IVR] SMS send failed:", err);
        // Non-fatal — still read the URL to them
      }
    }

    const readableUrl = `${business.subdomain} dot reservezy dot com`;

    return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">
    Great! We've sent the booking link to your phone.
    You can also visit ${readableUrl} at any time to book online.
    Goodbye!
  </Say>
  <Hangup/>
</Response>`);
  }

  // Digits = 2 or anything else → forward the call
  return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy" language="en-GB">Connecting you now. Please hold.</Say>
  ${forwardBlock}
</Response>`);
}
