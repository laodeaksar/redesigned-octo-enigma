// =============================================================================
// accounts table
// Managed by: auth-service (Better-auth internal use)
// Used for: linked OAuth accounts managed by Better-auth
// =============================================================================

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { usersTable } from "./users";

export const accountsTable = pgTable("accounts", {
  id: primaryId(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps(),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type AccountRow = typeof accountsTable.$inferSelect;
export type NewAccountRow = typeof accountsTable.$inferInsert;
