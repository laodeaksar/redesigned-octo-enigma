// =============================================================================
// addresses table
// Managed by: auth-service
// =============================================================================

import {
  boolean,
  char,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { usersTable } from "./users";

export const addressesTable = pgTable(
  "addresses",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 50 }).notNull(), // e.g. "Home", "Office"
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    street: text("street").notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    postalCode: char("postal_code", { length: 5 }).notNull(),
    country: char("country", { length: 2 }).notNull().default("ID"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
  },
  (t) => ({
    addressesUserIdIdx: index("addresses_user_id_idx").on(t.userId),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const addressesRelations = relations(addressesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [addressesTable.userId],
    references: [usersTable.id],
  }),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type AddressRow = typeof addressesTable.$inferSelect;
export type NewAddressRow = typeof addressesTable.$inferInsert;
