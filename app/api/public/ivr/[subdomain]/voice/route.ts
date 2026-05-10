/**
 * POST /api/public/ivr/[subdomain]/voice
 *
 * Twilio calls this webhook when a customer dials the business's Twilio number.
 * Returns TwiML that presents the IVR menu.
 */
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function twiml(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(
  _req: Request,
  { params }: { params: { subdomain: string } },
): Promise<Response> {
  const subdomain = params.subdomain.trim().toLowerCase();

  const business = await prisma.business.findFirst({
    where: { subdomain, isDisabled: false, ivrEnabled: true },
    select: { name: true, subdomain: true, ivrForwardNumber: true },
  });

  if (!business) {
    return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This number is not currently active. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }

  const base         = process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com";
  const gatherAction = `${base}/api/public/ivr/${encodeURIComponent(subdomain)}/gather`;
  const name         = business.name.replace(/[<>&'"]/g, "");

  const forwardBlock = business.ivrForwardNumber
    ? `<Dial>${business.ivrForwardNumber}</Dial>`
    : `<Say>I'm sorry, we're unable to connect your call right now. Please try again later. Goodbye.</Say><Hangup/>`;

  return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${gatherAction}" method="POST" timeout="10">
    <Say voice="Polly.Amy" language="en-GB">
      Thank you for calling ${name}.
      Press 1 to receive our online booking link by text message.
      Press 2 to speak with us directly.
    </Say>
  </Gather>
  ${forwardBlock}
</Response>`);
}
