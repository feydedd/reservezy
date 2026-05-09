import { z } from "zod";

const scratchLike = ["", "scratch", "none"];

export const registerBusinessSchema = z.object({
  industrySlug: z
    .union([z.string().max(64), z.literal(null)])
    .optional()
    .transform((value) => {
      const raw =
        typeof value === "string" ? value.trim().toLowerCase() : "";
      if (!raw || scratchLike.includes(raw)) {
        return undefined;
      }
      return raw;
    }),
  businessName: z.string().trim().min(2).max(120),
  subdomain: z.string().trim().min(3).max(63),
  ownerFullName: z.string().trim().min(2).max(120),
  ownerEmail: z
    .string()
    .trim()
    .max(320)
    .transform((raw) => raw.toLowerCase())
    .superRefine((value, ctx) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid email.",
        });
      }
    }),
  ownerPassword: z.string().min(8).max(256),
});

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
