// =============================================================================
// users table
// Managed by: auth-service
// =============================================================================

import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import {
  primaryId,
  softDelete,
  timestamps,
  userRoleEnum,
  userStatusEnum,
} from "./_helpers";
import { oauthAccountsTable } from "./oauth-accounts";
import { sessionsTable } from "./sessions";
import { addressesTable } from "./addresses";

export const usersTable = pgTable("users", {
  id: primaryId(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: text("password_hash"), // null = OAuth-only account
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("pending_verification"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  ...timestamps(),
  ...softDelete(),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(usersTable, ({ many }) => ({
  oauthAccounts: many(oauthAccountsTable),
  sessions: many(sessionsTable),
  addresses: many(addressesTable),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRow = typeof usersTable.$inferSelect;
export type NewUserRow = typeof usersTable.$inferInsert;
