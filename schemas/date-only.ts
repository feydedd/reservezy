import { z } from "zod";

import { parseUtcDateOnly } from "@/lib/dates/utc-date-only";

export const utcDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .superRefine((raw, ctx) => {
    if (!parseUtcDateOnly(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a UTC calendar date formatted as YYYY-MM-DD.",
      });
    }
  });
