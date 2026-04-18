import { defineConfig } from "drizzle-kit";

// drizzle.config.ts is used by drizzle-kit CLI commands:
//   bun run db:generate   → generate SQL migrations from schema changes
//   bun run db:migrate    → apply pending migrations
//   bun run db:studio     → open Drizzle Studio UI
//   bun run db:push       → push schema directly (dev only, no migration file)
//
// DATABASE_URL must be set in the shell or .env before running these commands.
// In Turbo pipelines, drizzle-kit commands are run with cache: false.

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
  // Include table comments in generated SQL
  verbose: true,
  // Warn if destructive changes are detected (DROP TABLE, DROP COLUMN, etc.)
  strict: true,
});
