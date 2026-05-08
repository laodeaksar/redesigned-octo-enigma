// =============================================================================
// Database Elysia plugin
// Decorates every handler with `{ db }` via Elysia's `.decorate()`
// =============================================================================

import { db } from "@/config";
import Elysia from "elysia";

export const databasePlugin = new Elysia({ name: "database" }).decorate(
  "db",
  db
);
