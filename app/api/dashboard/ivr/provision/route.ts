/**
 * POST /api/dashboard/ivr/provision
 *   Buys a Twilio number for the business (managed IVR).
 *   Allowed for Premium users (free) or after IVR add-on subscription is active.
 *
 * DELETE /api/dashboard/ivr/provision
 *   Releases the provisioned Twilio number and clears managed IVR state.
 */
import twilio from "twilio";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";

export const runtime = "nodejs";

const provisionSchema = z.object({
  countryCode: z.string().length(2).toUpperCase().default("GB"),
});

function twilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured.");
  return twilio(sid, token);
}

/** Premium tier gets managed IVR for free; Basic/Standard need the add-on subscription. */
function canUseManagedIvr(
  tier: string,
  ivrAddOnSubscriptionId: string | null,
): boolean {
  if (tier === "PREMIUM") return true;
  return !!ivrAddOnSubscriptionId;
}

export async function POST(req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = provisionSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request.", 400);
  const { countryCode } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      subdomain: true,
      ivrPhoneSid: true,
      ivrAddOnSubscriptionId: true,
      subscriptionTier: true,
    },
  });
  if (!business) return jsonError("Business not found.", 404);

  if (!canUseManagedIvr(business.subscriptionTier, business.ivrAddOnSubscriptionId)) {
    return jsonError("Managed IVR requires Premium or the IVR add-on subscription.", 403);
  }

  if (business.ivrPhoneSid) {
    return jsonError("A number is already provisioned. Release it first.", 409);
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com";
  const voiceUrl  = `${appUrl}/api/public/ivr/${encodeURIComponent(business.subdomain)}/voice`;

  let client;
  try {
    client = twilioClient();
  } catch {
    return jsonError("Twilio is not configured on this server.", 503);
  }

  // Search for an available local number with voice + SMS enabled
  let phoneNumber: string;
  let sid: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const available = await (client.availablePhoneNumbers(countryCode) as any)
      .local.list({ limit: 1, voiceEnabled: true, smsEnabled: true });

    if (!available.length) {
      return jsonError(
        `No phone numbers currently available in ${countryCode}. Try a different country code.`,
        422,
      );
    }

    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber:  available[0].phoneNumber,
      voiceUrl,
      voiceMethod: "POST",
    });

    phoneNumber = purchased.phoneNumber;
    sid         = purchased.sid;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Twilio error.";
    console.error("[IVR provision] Twilio error:", msg);
    return jsonError(`Could not provision number: ${msg}`, 502);
  }

  const updated = await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ivrManagedEnabled: true,
      ivrEnabled: true,
      ivrPhoneNumber: phoneNumber,
      ivrPhoneSid: sid,
    },
    select: {
      ivrEnabled: true,
      ivrManagedEnabled: true,
      ivrPhoneNumber: true,
      ivrForwardNumber: true,
    },
  });

  return jsonOk({ ...updated, provisioned: true });
}

export async function DELETE(_req: Request): Promise<Response> {
  const session = await getReservezySession();
  const ctx = await loadDashboardBusinessContext(session);
  if (!ctx) return jsonError("Unauthorised.", 401);
  try {
    requireBusinessOwner(ctx);
  } catch {
    return jsonError("Forbidden.", 403);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { ivrPhoneSid: true },
  });
  if (!business) return jsonError("Business not found.", 404);
  if (!business.ivrPhoneSid) return jsonError("No provisioned number to release.", 404);

  let client;
  try {
    client = twilioClient();
  } catch {
    return jsonError("Twilio is not configured on this server.", 503);
  }

  try {
    await client.incomingPhoneNumbers(business.ivrPhoneSid).remove();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown Twilio error.";
    console.error("[IVR deprovision] Twilio error:", msg);
    // Non-fatal: clear DB record anyway to avoid orphan state
  }

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ivrManagedEnabled: false,
      ivrPhoneNumber: null,
      ivrPhoneSid: null,
    },
  });

  return jsonOk({ released: true });
}
