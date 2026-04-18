// =============================================================================
// sessions table
// Managed by: auth-service (Better-auth)
// =============================================================================

import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { usersTable } from "./users";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }), // supports IPv6
    ...timestamps(),
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
    tokenIdx: uniqueIndex("sessions_token_idx").on(t.token),
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionRow = typeof sessionsTable.$inferSelect;
export type NewSessionRow = typeof sessionsTable.$inferInsert;
