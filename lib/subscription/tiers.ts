import type { SubscriptionTier } from "@prisma/client";

export function hasStandardNotifications(tier: SubscriptionTier): boolean {
  return tier === "STANDARD" || tier === "PREMIUM";
}

export function hasPremiumFeatures(tier: SubscriptionTier): boolean {
  return tier === "PREMIUM";
}

export function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case "BASIC":
      return "Basic";
    case "STANDARD":
      return "Standard";
    case "PREMIUM":
      return "Premium";
    default: {
      const exhaustive: never = tier;
      return exhaustive;
    }
  }
}
