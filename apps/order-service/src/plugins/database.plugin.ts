// =============================================================================
// database.plugin.ts — decorate context with Drizzle db (for vouchers)
// =============================================================================
import { db } from "@/config";
import Elysia from "elysia";

export const databasePlugin = new Elysia({ name: "database" }).decorate(
  "db",
  db
);
