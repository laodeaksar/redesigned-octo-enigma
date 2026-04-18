// =============================================================================
// Drizzle migration runner
// Run: bun run db:migrate
//
// Applies all pending SQL migrations in drizzle/migrations/ to the database.
// Safe to run on every deploy — skips already-applied migrations.
// =============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "node:path";

const DATABASE_URL = process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "./migrations");

async function runMigrations() {
  console.info("🗄️  Running Drizzle migrations…");
  console.info(`   Database: ${DATABASE_URL!.replace(/:[^:@]+@/, ":****@")}`);
  console.info(`   Migrations: ${MIGRATIONS_DIR}`);

  // Single connection for migration — not a pool
  const sql = postgres(DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.info("✅ Migrations applied successfully.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

await runMigrations();
