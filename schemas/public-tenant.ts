import { z } from "zod";

const isoInstant = z
  .string()
  .min(10)
  .superRefine((value, ctx) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected an ISO-8601 timestamp.",
      });
    }
  });

export const publicAvailabilityQuerySchema = z.object({
  serviceId: z.string().cuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  staffMemberId: z.string().cuid().optional(),
  businessLocationId: z.string().cuid().optional(),
});

export type PublicAvailabilityQuery = z.infer<
  typeof publicAvailabilityQuerySchema
>;

export const publicBookingCreateSchema = z.object({
  serviceId: z.string().cuid(),
  staffMemberId: z.string().cuid().nullable().optional(),
  startsAt: isoInstant,
  endsAt: isoInstant,
  customerFullName: z.string().trim().min(2).max(160),
  customerEmail: z
    .string()
    .trim()
    .max(320)
    .transform((raw) => raw.toLowerCase())
    .superRefine((value, ctx) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid customer email.",
        });
      }
    }),
  customerPhone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  promoCode: z.string().trim().min(1).max(40).optional(),
  referralToken: z.string().trim().min(8).max(64).optional(),
  businessLocationId: z.string().cuid().optional(),
  intakeAnswers: z.record(z.string(), z.string()).optional(),
});

export type PublicBookingCreateInput = z.infer<
  typeof publicBookingCreateSchema
>;
