import { z } from "zod";

const isoInstant = z
  .string()
  .min(10)
  .superRefine((value, ctx) => {
    if (Number.isNaN(Date.parse(value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expected an ISO-8601 timestamp.",
      });
    }
  });

export const dashboardBookingListQuerySchema = z.object({
  from: isoInstant.optional(),
  to: isoInstant.optional(),
  serviceId: z.string().cuid().optional(),
  staffMemberId: z.string().cuid().optional(),
  status: z
    .enum([
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
      "PENDING_PAYMENT",
    ])
    .optional(),
});

export const dashboardBookingStatusPatchSchema = z.object({
  status: z
    .enum([
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
      "PENDING_PAYMENT",
    ])
    .optional(),
  staffNotes: z.string().trim().max(8000).optional(),
}).refine((v) => v.status !== undefined || v.staffNotes !== undefined, {
  message: "Provide status and/or staffNotes.",
});
