// =============================================================================
// database.plugin.ts
// =============================================================================

import Elysia from "elysia";
import { db } from "@/config";

export const databasePlugin = new Elysia({ name: "database" }).decorate(
  "db",
  db,
);
