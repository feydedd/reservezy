import { z } from "zod";

import { utcDateSchema } from "@/schemas/date-only";

export const onboardingBrandingPatchSchema = z.object({
  step: z.literal("branding"),
  data: z.object({
    logoUrl: z.union([z.string().url(), z.literal("")]).optional(),
    primaryColour: z.union([hexColourSchema(), z.literal("")]).optional(),
    secondaryColour: z.union([hexColourSchema(), z.literal("")]).optional(),
    googleFontFamily: z.string().trim().max(120).optional(),
  }),
});

function hexColourSchema() {
  return z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex value like #0f766e.");
}

export const onboardingAvailabilityPatchSchema = z.object({
  step: z.literal("availability"),
  data: z.object({
    bookingBufferMinutes: z.number().int().min(0).max(240),
    workingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          openMinutes: z.number().int().min(0).max(24 * 60 - 1),
          closeMinutes: z.number().int().min(0).max(24 * 60 - 1),
        }),
      )
      .min(1),
    holidays: z
      .array(
        z.object({
          date: utcDateSchema,
          label: z.string().trim().max(160).optional(),
        }),
      )
      .default([]),
  }),
});

export const onboardingServicesPatchSchema = z.object({
  step: z.literal("services"),
  data: z.object({
    slotMode: z.enum(["FIXED", "FLEXIBLE"]),
    services: z
      .array(
        z.object({
          id: z.string().cuid().optional(),
          name: z.string().trim().min(2).max(160),
          description: z.string().trim().max(2000).optional().default(""),
          durationMinutes: z.number().int().min(5).max(24 * 60),
          pricePence: z.number().int().min(0).max(100_000_000),
          sortOrder: z.number().int().min(0).max(10_000).optional(),
        }),
      )
      .default([]),
  }),
});

export const onboardingStaffPatchSchema = z.object({
  step: z.literal("staff"),
  data: z.object({
    allowCustomerStaffSelection: z.boolean(),
    members: z
      .array(
        z.object({
          fullName: z.string().trim().min(2).max(120),
          email: z
            .string()
            .trim()
            .max(320)
            .transform((raw) => raw.toLowerCase())
            .superRefine((value, ctx) => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Staff email is invalid.",
                });
              }
            }),
          password: z.string().min(8).max(256),
          offeredServiceIds: z.array(z.string().cuid()).default([]),
          workingHours: z
            .array(
              z.object({
                dayOfWeek: z.number().int().min(0).max(6),
                openMinutes: z.number().int().min(0).max(24 * 60 - 1),
                closeMinutes: z.number().int().min(0).max(24 * 60 - 1),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
  }),
});

export const onboardingBookingRulesPatchSchema = z.object({
  step: z.literal("bookingRules"),
  data: z.object({
    allowCustomerCancelReschedule: z.boolean(),
    cancellationNoticeHours: z.number().int().min(1).max(24 * 14),
    allowCustomerStaffSelection: z.boolean(),
  }),
});

export const onboardingSkipBillingPatchSchema = z.object({
  step: z.literal("skipBilling"),
  data: z.object({}).optional(),
});

export const onboardingPatchSchema = z.discriminatedUnion("step", [
  onboardingBrandingPatchSchema,
  onboardingAvailabilityPatchSchema,
  onboardingServicesPatchSchema,
  onboardingStaffPatchSchema,
  onboardingBookingRulesPatchSchema,
  onboardingSkipBillingPatchSchema,
]);

export type OnboardingPatchPayload = z.infer<typeof onboardingPatchSchema>;
