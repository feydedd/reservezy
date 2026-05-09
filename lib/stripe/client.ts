import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripeOrNull(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey);
  }

  return stripeSingleton;
}

export function getStripeConfigured(): Stripe {
  const stripe = getStripeOrNull();
  if (!stripe) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }
  return stripe;
}
