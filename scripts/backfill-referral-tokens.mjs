// One-shot: add Customer.referralToken if missing, backfill, then mark NOT NULL UNIQUE.
// After this, `npx prisma db push` can complete the remaining schema changes safely.

import crypto from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

function newToken() {
  return crypto.randomBytes(16).toString("hex");
}

async function columnExists(table, column) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  );
  return res.rowCount > 0;
}

async function constraintExists(table, name) {
  const res = await client.query(
    `SELECT 1 FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.relname = $1 AND c.conname = $2 LIMIT 1`,
    [table, name],
  );
  return res.rowCount > 0;
}

async function run() {
  await client.connect();
  console.log("Connected.");

  if (!(await columnExists("Customer", "referralToken"))) {
    console.log("Adding Customer.referralToken (nullable)...");
    await client.query(`ALTER TABLE "Customer" ADD COLUMN "referralToken" TEXT`);
  } else {
    console.log("Customer.referralToken column already exists.");
  }

  const missing = await client.query(
    `SELECT id FROM "Customer" WHERE "referralToken" IS NULL OR "referralToken" = ''`,
  );
  console.log(`Backfilling ${missing.rowCount} customers...`);
  for (const row of missing.rows) {
    let attempt = 0;
    while (attempt < 5) {
      try {
        await client.query(
          `UPDATE "Customer" SET "referralToken" = $1 WHERE "id" = $2`,
          [newToken(), row.id],
        );
        break;
      } catch (err) {
        attempt += 1;
        if (attempt >= 5) {
          throw err;
        }
      }
    }
  }

  console.log("Setting NOT NULL...");
  await client.query(
    `ALTER TABLE "Customer" ALTER COLUMN "referralToken" SET NOT NULL`,
  );

  if (!(await constraintExists("Customer", "Customer_referralToken_key"))) {
    console.log("Adding UNIQUE constraint...");
    await client.query(
      `ALTER TABLE "Customer" ADD CONSTRAINT "Customer_referralToken_key" UNIQUE ("referralToken")`,
    );
  } else {
    console.log("Unique constraint already present.");
  }

  console.log("Done.");
  await client.end();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await client.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
