/**
 * CEEDA — Migration runner
 *
 * Applies all pending SQL migrations from lib/db/migrations/ to the database.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @workspace/db run migrate
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — ensure the database is provisioned");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "../migrations");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

console.log("🗄   Running CEEDA database migrations…");
console.log(`    Migrations folder: ${migrationsFolder}\n`);

try {
  await migrate(db, { migrationsFolder });
  console.log("✅  All migrations applied successfully!");
} catch (err) {
  console.error("❌  Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
