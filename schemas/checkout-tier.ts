import { z } from "zod";

export const onboardingCheckoutTierSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
});

export type OnboardingCheckoutTierInput = z.infer<
  typeof onboardingCheckoutTierSchema
>;
