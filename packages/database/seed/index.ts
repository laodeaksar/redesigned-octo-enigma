// =============================================================================
// Database seed runner
// Run: bun run db:seed
//
// Seeds run in dependency order:
//   1. users       (no deps)
//   2. categories  (no deps)
//   3. products    (depends on categories)
//
// Safe to re-run — all inserts use onConflictDoNothing.
// =============================================================================

import { createDrizzleClient } from "../drizzle/client";
import { seedUsers } from "./users.seed";
import { seedCategories } from "./categories.seed";
import { seedProducts } from "./products.seed";

const DATABASE_URL = process.env["DATABASE_URL"];

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set.");
  process.exit(1);
}

async function runSeeds() {
  console.info("\n🌱 Starting database seed…\n");

  const db = createDrizzleClient({
    url: DATABASE_URL!,
    maxConnections: 3,
    debug: false,
  });

  try {
    await seedUsers(db);
    await seedCategories(db);
    await seedProducts(db);

    console.info("\n✅ Seed completed successfully.\n");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

await runSeeds();
