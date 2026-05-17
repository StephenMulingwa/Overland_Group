/**
 * Creates Control Tower tables in Neon and optionally seeds the first admin
 * from OVERLAND_BOOTSTRAP_EMAIL / OVERLAND_BOOTSTRAP_PASSWORD when the users table is empty.
 *
 * Usage: node scripts/apply-schema.mjs
 * Loads .env from project root (same folder as package.json).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env") });

function dbUrl() {
  const u =
    process.env.overland_neon_token ??
    process.env.OVERLAND_NEON_TOKEN ??
    process.env.DATABASE_URL;
  if (!u) {
    console.error(
      "Missing DB URL: set overland_neon_token (or OVERLAND_NEON_TOKEN / DATABASE_URL)",
    );
    process.exit(1);
  }
  return u;
}

function stripQuotes(s) {
  const t = String(s ?? "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function splitSqlStatements(sqlText) {
  const noComments = sqlText.replace(/--[^\n]*/g, "");
  return noComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Must match lib/auth/superAdmin.ts */
const SUPER_ADMIN_EMAIL = "musyoka@controltech-ea.com";

async function ensureSuperAdmin(client) {
  const superPass = stripQuotes(process.env.OVERLAND_SUPER_ADMIN_PASSWORD);
  const superName =
    stripQuotes(process.env.OVERLAND_SUPER_ADMIN_NAME) || "Super Admin";

  const { rows } = await client.query(
    `SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
    [SUPER_ADMIN_EMAIL],
  );

  if (rows.length > 0) {
    await client.query(
      `UPDATE users
       SET role = 'admin', active = true, updated_at = NOW()
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
      [SUPER_ADMIN_EMAIL],
    );
    console.log(`Super Admin ensured (active admin): ${SUPER_ADMIN_EMAIL}`);
    return;
  }

  if (superPass) {
    const password_hash = await bcrypt.hash(superPass, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [SUPER_ADMIN_EMAIL, password_hash, superName],
    );
    console.log(`Created Super Admin: ${SUPER_ADMIN_EMAIL}`);
  } else {
    console.log(
      `Note: Super Admin ${SUPER_ADMIN_EMAIL} is not in the database yet. Create the account in Admin, or set OVERLAND_SUPER_ADMIN_PASSWORD in .env and run npm run db:init.`,
    );
  }
}

async function main() {
  const url = dbUrl();
  const schemaPath = path.join(root, "db", "schema.sql");
  const schemaText = fs.readFileSync(schemaPath, "utf8");
  const statements = splitSqlStatements(schemaText);

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const stmt of statements) {
      await client.query(stmt + ";");
    }
    console.log("Schema applied: tables and seed phone directory are ready.");

    await ensureSuperAdmin(client);

    const {
      rows: [{ n }],
    } = await client.query("SELECT COUNT(*)::int AS n FROM users");
    if (Number(n) > 0) {
      console.log(`Users table already has ${n} row(s). Skipping bootstrap seed.`);
      return;
    }

    const email = stripQuotes(process.env.OVERLAND_BOOTSTRAP_EMAIL);
    const plain = stripQuotes(process.env.OVERLAND_BOOTSTRAP_PASSWORD);
    const fullName =
      stripQuotes(process.env.OVERLAND_BOOTSTRAP_NAME) || "Administrator";

    if (!email || !plain) {
      console.log(
        "No users yet. Set OVERLAND_BOOTSTRAP_EMAIL and OVERLAND_BOOTSTRAP_PASSWORD in .env, then run this script again, or open /login/bootstrap.",
      );
      return;
    }

    const password_hash = await bcrypt.hash(plain, 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [email, password_hash, fullName],
    );
    console.log(`Created admin user: ${email}`);
    console.log("You can sign in at /login with that email and password.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
