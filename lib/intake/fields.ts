import { z } from "zod";

export const intakeFieldSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  type: z.enum(["text", "textarea"]),
  required: z.boolean(),
});

export type IntakeField = z.infer<typeof intakeFieldSchema>;

export function parseIntakeFieldsJson(raw: unknown): IntakeField[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: IntakeField[] = [];
  for (const row of raw) {
    const p = intakeFieldSchema.safeParse(row);
    if (p.success) {
      out.push(p.data);
    }
  }
  return out;
}

export function validateIntakeAnswers(
  fields: IntakeField[],
  answers: Record<string, string> | undefined,
): { ok: true } | { ok: false; error: string } {
  if (fields.length === 0) {
    if (answers && Object.keys(answers).length > 0) {
      return { ok: false, error: "This service does not use an intake form." };
    }
    return { ok: true };
  }
  if (!answers) {
    return { ok: false, error: "Intake answers are required." };
  }
  for (const f of fields) {
    const v = answers[f.id]?.trim() ?? "";
    if (f.required && v.length === 0) {
      return { ok: false, error: `Please fill in: ${f.label}` };
    }
    if (v.length > 4000) {
      return { ok: false, error: `Response too long for: ${f.label}` };
    }
  }
  return { ok: true };
}
