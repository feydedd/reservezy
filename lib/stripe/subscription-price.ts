import type { SubscriptionTier } from "@prisma/client";

export function getStripePriceIdForTier(tier: SubscriptionTier): string {
  switch (tier) {
    case "BASIC": {
      const id = process.env.STRIPE_PRICE_BASIC;
      if (!id) {
        throw new Error("Missing STRIPE_PRICE_BASIC.");
      }
      return id;
    }
    case "STANDARD": {
      const id = process.env.STRIPE_PRICE_STANDARD;
      if (!id) {
        throw new Error("Missing STRIPE_PRICE_STANDARD.");
      }
      return id;
    }
    case "PREMIUM": {
      const id = process.env.STRIPE_PRICE_PREMIUM;
      if (!id) {
        throw new Error("Missing STRIPE_PRICE_PREMIUM.");
      }
      return id;
    }
    default: {
      const exhaustive: never = tier;
      return exhaustive;
    }
  }
}
