import { z } from "zod";

export const onboardingCheckoutTierSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  /** ISO 3166-1 alpha-2 — used to provision the managed phone number after checkout. */
  ivrCountryCode: z
    .string()
    .length(2)
    .transform((s) => s.toUpperCase())
    .optional(),
});

export type OnboardingCheckoutTierInput = z.infer<
  typeof onboardingCheckoutTierSchema
>;
