import Stripe from "stripe";

import {
  SubscriptionStatus as BillingLifecycleState,
  SubscriptionTier as PricingPlanTier,
} from "@prisma/client";

import { jsonError } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";

function parsePricingPlanTier(raw?: string | null): PricingPlanTier | null {
  if (raw === "BASIC" || raw === "STANDARD" || raw === "PREMIUM") {
    return raw as PricingPlanTier;
  }
  return null;
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") {
    return;
  }

  if (session.payment_status !== "paid") {
    return;
  }

  const stripe = getStripeConfigured();
  const tierFromSession = parsePricingPlanTier(session.metadata?.tier ?? null);
  const businessIdFromSession = session.metadata?.businessId ?? undefined;

  const subscriptionReference = session.subscription;
  const subscriptionId =
    typeof subscriptionReference === "string"
      ? subscriptionReference
      : subscriptionReference?.id;

  if (!subscriptionId) {
    return;
  }

  type StripeBillingSnapshot = {
    id: string;
    metadata: Stripe.Metadata | null | undefined;
    customer: Stripe.Checkout.Session["customer"];
    items: { data: Array<{ price?: { id?: string | null } | null }> };
    current_period_end: number;
    cancel_at_period_end: boolean;
  };

  const subscriptionResponse =
    await stripe.subscriptions.retrieve(subscriptionId);
  const stripeBilling = subscriptionResponse as unknown as StripeBillingSnapshot;
  const tierFromStripe = parsePricingPlanTier(
    stripeBilling.metadata?.tier ?? null,
  );
  const resolvedTier = tierFromStripe ?? tierFromSession;

  const businessId =
    stripeBilling.metadata?.businessId ?? businessIdFromSession;

  if (!businessId || !resolvedTier) {
    console.warn(
      "[stripe webhook] Missing business linkage on subscription metadata.",
      { sessionId: session.id },
    );
    return;
  }

  const customerReference = stripeBilling.customer;
  const stripeCustomerId =
    typeof customerReference === "string"
      ? customerReference
      : typeof customerReference === "object" && customerReference?.id
        ? customerReference.id
        : undefined;

  const stripePriceId =
    stripeBilling.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = new Date(
    stripeBilling.current_period_end * 1000,
  );

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        onboardingComplete: true,
        onboardingStep: 8,
        stripeCustomerId,
        stripeSubscriptionId: stripeBilling.id,
        subscriptionTier: resolvedTier,
        subscriptionStatus: BillingLifecycleState.ACTIVE,
      },
    });

    await tx.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        tier: resolvedTier,
        status: BillingLifecycleState.ACTIVE,
        stripeSubscriptionId: stripeBilling.id,
        stripePriceId: stripePriceId ?? undefined,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeBilling.cancel_at_period_end,
      },
      update: {
        tier: resolvedTier,
        status: BillingLifecycleState.ACTIVE,
        stripeSubscriptionId: stripeBilling.id,
        stripePriceId: stripePriceId ?? undefined,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeBilling.cancel_at_period_end,
      },
    });
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const businessId = sub.metadata?.businessId;
  if (!businessId) return;

  type SubSnap = {
    id: string;
    metadata: Stripe.Metadata;
    items: { data: Array<{ price?: { id?: string | null } | null }> };
    current_period_end: number;
    cancel_at_period_end: boolean;
    status: string;
  };

  const snap = sub as unknown as SubSnap;
  const tier = parsePricingPlanTier(snap.metadata?.tier ?? null);
  const stripePriceId = snap.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = new Date(snap.current_period_end * 1000);

  const statusMap: Record<string, BillingLifecycleState> = {
    active: BillingLifecycleState.ACTIVE,
    trialing: BillingLifecycleState.TRIALING,
    past_due: BillingLifecycleState.PAST_DUE,
    canceled: BillingLifecycleState.CANCELED,
    unpaid: BillingLifecycleState.UNPAID,
    paused: BillingLifecycleState.PAUSED,
    incomplete: BillingLifecycleState.INCOMPLETE,
  };
  const status = statusMap[snap.status] ?? BillingLifecycleState.INACTIVE;

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        ...(tier ? { subscriptionTier: tier } : {}),
        subscriptionStatus: status,
      },
    });
    await tx.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        tier: tier ?? PricingPlanTier.BASIC,
        status,
        stripeSubscriptionId: snap.id,
        stripePriceId: stripePriceId ?? undefined,
        currentPeriodEnd,
        cancelAtPeriodEnd: snap.cancel_at_period_end,
      },
      update: {
        ...(tier ? { tier } : {}),
        status,
        stripeSubscriptionId: snap.id,
        stripePriceId: stripePriceId ?? undefined,
        currentPeriodEnd,
        cancelAtPeriodEnd: snap.cancel_at_period_end,
      },
    });
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const businessId = (sub as unknown as { metadata: Stripe.Metadata }).metadata?.businessId;
  if (!businessId) return;

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: BillingLifecycleState.CANCELED,
        subscriptionTier: PricingPlanTier.BASIC,
      },
    });
    await tx.subscription.updateMany({
      where: { businessId },
      data: {
        status: BillingLifecycleState.CANCELED,
        cancelAtPeriodEnd: false,
      },
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return jsonError("Stripe webhook secret is missing.", 501);
  }

  const stripe = getStripeConfigured();
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return jsonError("Invalid Stripe webhook signature.", 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const sessionStripe = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(sessionStripe);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
