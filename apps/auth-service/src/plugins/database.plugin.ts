// =============================================================================
// Database Elysia plugin
// Decorates every handler with `{ db }` via Elysia's `.decorate()`
// =============================================================================

import Elysia from "elysia";
import { db } from "@/config";

export const databasePlugin = new Elysia({ name: "database" }).decorate(
  "db",
  db
);

