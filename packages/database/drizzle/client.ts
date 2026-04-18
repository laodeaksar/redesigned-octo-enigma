// =============================================================================
// Drizzle PostgreSQL client factory
// Each service creates its own connection via createDrizzleClient()
// =============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { Sql } from "postgres";

import * as schema from "./schema";

export interface DrizzleClientOptions {
  url: string;
  /** Max connections in the pool. Default: 10 */
  maxConnections?: number;
  /** Connection timeout in seconds. Default: 30 */
  connectTimeout?: number;
  /** Log all SQL queries. Set to true in development only */
  debug?: boolean;
}

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>> & {
  $client: Sql;
};

/**
 * Create a Drizzle ORM client connected to PostgreSQL.
 * Call once at service startup and pass the instance around via DI/context.
 *
 * Usage (in a service's src/db.ts):
 *   import { createDrizzleClient } from "@repo/database/drizzle"
 *   import { env } from "@repo/env/auth-service"
 *
 *   export const db = createDrizzleClient({ url: env.DATABASE_URL })
 *   export type DB = typeof db
 */
export function createDrizzleClient(
  options: DrizzleClientOptions,
): DrizzleClient {
  const {
    url,
    maxConnections = 10,
    connectTimeout = 30,
    debug = false,
  } = options;

  if (!url) {
    throw new Error("DATABASE_URL is required to create Drizzle client");
  }

  const sql = postgres(url, {
    max: maxConnections,
    connect_timeout: connectTimeout,
    idle_timeout: 20, // close idle connections after 20s
    max_lifetime: 60 * 30, // recycle connections after 30 min
    prepare: false, // MUST be false for PgBouncer transaction mode
    ...(debug && {
      onnotice: (notice) => console.info("[PostgreSQL notice]", notice),
    }),
  });

  const db = drizzle(sql, {
    schema,
    logger: debug,
  });

  // Expose raw sql client so we can close it later
  return Object.assign(db, { $client: sql });
}

/** Helper to safely close the connection pool — call on graceful shutdown */
export async function closeDrizzleClient(db: DrizzleClient): Promise<void> {
  await db.$client.end({ timeout: 5 });
}

// ── Re-export schema for convenience ─────────────────────────────────────────
export * from "./schema";
