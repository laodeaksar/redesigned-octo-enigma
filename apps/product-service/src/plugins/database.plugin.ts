// =============================================================================
// database.plugin.ts — decorate context with db + redis
// =============================================================================

import Elysia from "elysia";
import { db, getRedis } from "@/config";

export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .decorate("redis", getRedis());

