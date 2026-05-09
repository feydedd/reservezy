import { z } from "zod";

export const credentialsLoginSchema = z.object({
  email: z
    .string()
    .min(3)
    .max(320)
    .transform((raw) => raw.trim().toLowerCase())
    .pipe(z.string().email()),
  password: z.string().min(8).max(256),
});

export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;
