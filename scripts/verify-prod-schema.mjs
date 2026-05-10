import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const required = [
  ["Business", "checklistDismissedIds"],
  ["Business", "reviewPromptEnabled"],
  ["Business", "reviewUrl"],
  ["Customer", "referralToken"],
  ["Booking", "staffNotes"],
  ["Booking", "intakeAnswersJson"],
  ["Booking", "businessLocationId"],
  ["Booking", "promoCodeId"],
  ["Booking", "discountPence"],
  ["Booking", "reviewPromptSentAt"],
  ["Service", "intakeFormFieldsJson"],
  ["Service", "businessLocationId"],
  ["StaffMember", "businessLocationId"],
];
const requiredTables = ["PromoCode", "BusinessLocation"];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  await client.connect();
  let ok = true;
  for (const [table, col] of required) {
    const r = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2 LIMIT 1`,
      [table, col],
    );
    if (r.rowCount === 0) {
      console.error(`MISSING column: ${table}.${col}`);
      ok = false;
    }
  }
  for (const t of requiredTables) {
    const r = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
      [t],
    );
    if (r.rowCount === 0) {
      console.error(`MISSING table: ${t}`);
      ok = false;
    }
  }
  await client.end();
  if (!ok) {
    process.exit(2);
  }
  console.log("All required schema additions are present.");
}

check().catch(async (err) => {
  console.error(err);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
