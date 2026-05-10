/**
 * UK phone number normalisation → E.164 format required by Twilio.
 *
 * Handles the most common ways a UK user will enter their number:
 *   07700 900000   → +447700900000
 *   07700900000    → +447700900000
 *   +44 7700 900000 → +447700900000
 *   0044 7700 900000 → +447700900000
 *   447700900000   → +447700900000
 *
 * Non-UK E.164 numbers (+1..., +33..., etc.) are passed through unchanged.
 * If the result doesn't look like a plausible phone number it is returned as-is
 * so downstream code can still attempt delivery or skip gracefully.
 */
export function normalisePhone(raw: string): string {
  if (!raw) return raw;

  // Strip whitespace, dots, dashes, parentheses
  let n = raw.replace(/[\s.()\-]/g, "");

  // 0044... → +44...
  if (n.startsWith("0044")) n = "+" + n.slice(2);

  // 07... → +447...
  if (/^07\d{9}$/.test(n)) return "+44" + n.slice(1);

  // 447... (no leading +) → +447...
  if (/^447\d{9}$/.test(n)) return "+" + n;

  // 44... (no leading +, any length) → prepend +
  if (/^44\d/.test(n) && !n.startsWith("+")) return "+" + n;

  // Already E.164
  return n;
}

/**
 * Returns true if the string looks like a valid UK mobile number in E.164.
 * (+447 followed by 9 digits = 13 chars total)
 */
export function isUkMobile(e164: string): boolean {
  return /^\+447\d{9}$/.test(e164);
}

/**
 * Returns true if the string looks like a plausible E.164 number (any country).
 */
export function isE164(s: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(s);
}
