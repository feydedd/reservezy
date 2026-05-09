/**
 * POST /api/billing/upgrade-checkout
 * Creates a Stripe Checkout session for an already-onboarded business upgrading their plan.
 */
import { z } from "zod";
import { SubscriptionTier } from "@prisma/client";

import { getReservezySession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getStripeOrNull } from "@/lib/stripe/client";
import { getStripePriceIdForTier } from "@/lib/stripe/subscription-price";

const schema = z.object({ tier: z.enum(["STANDARD", "PREMIUM"]) });

export async function POST(req: Request): Promise<Response> {
  const stripe = getStripeOrNull();
  if (!stripe) return jsonError("Stripe is not configured.", 503);

  const session = await getReservezySession();
  if (!session?.user || session.user.role !== "BUSINESS_OWNER" || !session.user.ownerId) {
    return jsonError("Unauthorized.", 401);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return jsonError("Invalid JSON.", 400); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid tier.", 422);

  const tier: SubscriptionTier = parsed.data.tier;

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.ownerId },
    include: { owner: true },
  });
  if (!business) return jsonError("Business not found.", 404);

  // If already on this tier or higher, reject
  const tierRank = { BASIC: 0, STANDARD: 1, PREMIUM: 2 };
  if (tierRank[business.subscriptionTier] >= tierRank[tier]) {
    return jsonError("Already on this tier or higher.", 409);
  }

  let priceId: string;
  try { priceId = getStripePriceIdForTier(tier); } catch {
    return jsonError("Stripe price IDs not configured.", 503);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // If they have an existing Stripe customer, use it
  let customerId: string | undefined = business.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: business.owner.email,
      name: business.name,
      metadata: { businessId: business.id },
    });
    customerId = customer.id;
    await prisma.business.update({ where: { id: business.id }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: business.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/dashboard/subscription?upgrade=success`,
    cancel_url: `${base}/dashboard/subscription?upgrade=cancel`,
    subscription_data: {
      metadata: { businessId: business.id, tier },
    },
    metadata: { intent: "reservezy-upgrade", businessId: business.id, tier },
  });

  return jsonOk({ url: checkoutSession.url ?? null });
}
