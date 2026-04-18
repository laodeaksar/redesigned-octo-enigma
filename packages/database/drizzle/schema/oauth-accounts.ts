// =============================================================================
// oauth_accounts table
// Managed by: auth-service (Better-auth)
// =============================================================================

import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, oauthProviderEnum, timestamps } from "./_helpers";
import { usersTable } from "./users";

export const oauthAccountsTable = pgTable(
  "oauth_accounts",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => ({
    // One account per provider per user
    oauthAccountsUserProviderIdx: index("oauth_accounts_user_provider_idx").on(
      t.userId,
      t.provider,
    ),
    // Fast lookup by provider + provider account ID (OAuth callback)
    oauthAccountsProviderAccountIdx: index(
      "oauth_accounts_provider_account_idx",
    ).on(t.provider, t.providerAccountId),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const oauthAccountsRelations = relations(
  oauthAccountsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [oauthAccountsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type OAuthAccountRow = typeof oauthAccountsTable.$inferSelect;
export type NewOAuthAccountRow = typeof oauthAccountsTable.$inferInsert;
