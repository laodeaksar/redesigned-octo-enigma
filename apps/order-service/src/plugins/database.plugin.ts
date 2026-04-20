// =============================================================================
// database.plugin.ts — decorate context with Drizzle db (for vouchers)
// =============================================================================
import Elysia from "elysia";
import { db } from "@/config";

export const databasePlugin = new Elysia({ name: "database" }).decorate("db", db);

