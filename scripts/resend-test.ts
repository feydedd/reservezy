/**
 * One-off / local: load `.env` + `.env.local` (no dotenv dep) and send a Resend ping.
 * Usage: npx tsx scripts/resend-test.ts [to@email.com]
 */
import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

function loadEnvFile(rel: string) {
  const filePath = path.join(process.cwd(), rel);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const key = process.env.RESEND_API_KEY;
const from =
  process.env.RESEND_FROM_EMAIL ?? "Reservezy <noreply@reservezy.com>";
const to = process.argv[2] ?? "noahlaycock10@gmail.com";

if (!key) {
  console.error("Missing RESEND_API_KEY in .env / .env.local");
  process.exit(1);
}

async function main() {
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Reservezy Resend test",
    text: `Sent from ${from} at ${new Date().toISOString()}`,
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log("OK", data?.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
