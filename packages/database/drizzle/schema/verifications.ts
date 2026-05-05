// =============================================================================
// verifications table
// Managed by: auth-service (Better-auth internal use)
// Used for: email verification, magic links, etc.
// =============================================================================

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { primaryId } from "./_helpers";

export const verificationsTable = pgTable("verifications", {
  id: primaryId(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerificationRow = typeof verificationsTable.$inferSelect;
export type NewVerificationRow = typeof verificationsTable.$inferInsert;
