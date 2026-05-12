import { SubscriptionTier } from "@prisma/client";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getStripeOrNull } from "@/lib/stripe/client";
import { getStripePriceIdForTier } from "@/lib/stripe/subscription-price";
import { onboardingCheckoutTierSchema } from "@/schemas/checkout-tier";

export async function POST(request: Request): Promise<Response> {
  const stripe = getStripeOrNull();
  if (!stripe) {
    return jsonError(
      "Stripe billing is not configured yet. Add STRIPE_SECRET_KEY and price IDs.",
      503,
    );
  }

  const sessionAuth = await getReservezySession();
  if (
    !sessionAuth?.user ||
    sessionAuth.user.role !== "BUSINESS_OWNER" ||
    !sessionAuth.user.ownerId
  ) {
    return jsonError("Unauthorized.", 401);
  }

  const business = await prisma.business.findUnique({
    where: { ownerId: sessionAuth.user.ownerId },
    include: {
      owner: true,
    },
  });

  if (!business) {
    return jsonError("Business record missing.", 404);
  }

  if (business.onboardingComplete) {
    return jsonError("Billing is already finalized for this business.", 409);
  }

  if (business.onboardingStep < 7) {
    return jsonError("Finish onboarding steps before choosing a subscription.", 422);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsedTier = onboardingCheckoutTierSchema.safeParse(body);
  if (!parsedTier.success) {
    return jsonError("Select a billing tier.", 422, parsedTier.error.flatten().fieldErrors);
  }

  const tierChoice: SubscriptionTier = parsedTier.data.tier;
  const ivrCountryCode = parsedTier.data.ivrCountryCode ?? "GB";

  let priceId: string;
  try {
    priceId = getStripePriceIdForTier(tierChoice);
  } catch {
    return jsonError(
      "Stripe price IDs are incomplete. Populate STRIPE_PRICE_* env vars.",
      503,
    );
  }

  const billingReturnBase =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: business.owner.email,
    client_reference_id: business.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${billingReturnBase}/onboarding?checkout=success`,
    cancel_url: `${billingReturnBase}/onboarding?checkout=cancel`,
    subscription_data: {
      metadata: {
        businessId: business.id,
        tier: tierChoice,
        ivrCountryCode,
      },
    },
    metadata: {
      intent: "reservezy-onboarding",
      businessId: business.id,
      tier: tierChoice,
      stripePriceId: priceId,
      ivrCountryCode,
    },
  });

  await prisma.business.update({
    where: { id: business.id },
    data: {
      subscriptionTier: tierChoice,
    },
  });

  return jsonOk({ url: checkoutSession.url ?? null }, 200);
}
