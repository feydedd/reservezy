/**
 * POST /api/dashboard/ivr/checkout
 * Creates a Stripe Checkout session for the IVR add-on (£2/month).
 * On successful payment, the Stripe webhook provisions the Twilio number.
 */
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";
import { loadDashboardBusinessContext } from "@/lib/server/session-business";
import { requireBusinessOwner } from "@/lib/server/dashboard-guards";
import { getStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

const bodySchema = z.object({
  countryCode: z.string().length(2).toUpperCase().default("GB"),
});

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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request.", 400);
  const { countryCode } = parsed.data;

  const priceId = process.env.STRIPE_PRICE_IVR_ADDON;
  if (!priceId) {
    return jsonError("IVR add-on Stripe price is not configured.", 503);
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      subscriptionTier: true,
      ivrAddOnSubscriptionId: true,
      stripeCustomerId: true,
    },
  });
  if (!business) return jsonError("Business not found.", 404);

  if (business.subscriptionTier === "PREMIUM") {
    return jsonError("Premium users get managed IVR for free — no checkout needed.", 400);
  }

  if (business.ivrAddOnSubscriptionId) {
    return jsonError("IVR add-on is already active.", 409);
  }

  const stripe    = getStripeConfigured();
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://reservezy.com";
  const returnUrl = `${appUrl}/dashboard/ivr?ivr_success=1`;
  const cancelUrl = `${appUrl}/dashboard/ivr`;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(business.stripeCustomerId
      ? { customer: business.stripeCustomerId }
      : {}),
    success_url: returnUrl,
    cancel_url:  cancelUrl,
    metadata: {
      type:        "ivr_addon",
      businessId:  ctx.businessId,
      countryCode,
    },
    subscription_data: {
      metadata: {
        type:        "ivr_addon",
        businessId:  ctx.businessId,
        countryCode,
      },
    },
  });

  return jsonOk({ url: checkoutSession.url });
}
