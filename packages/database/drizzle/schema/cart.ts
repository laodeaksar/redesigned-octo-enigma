// =============================================================================
// carts + cart_items tables
// Managed by: product-service
//
// Design:
//   - One cart per user (lazy-created on first add)
//   - Items reference product_variants for live-price lookup
//   - Price is NOT stored here — always read live from product_variants
//   - UNIQUE(cart_id, variant_id) — duplicate adds increase quantity via upsert
// =============================================================================

import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { primaryId, timestamps } from "./_helpers";
import { productVariantsTable } from "./product-variants";
import { usersTable } from "./users";

// ── carts ─────────────────────────────────────────────────────────────────────

export const cartsTable = pgTable(
  "carts",
  {
    id: primaryId(),
    /** FK → users.id  (one cart per user) */
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  t => ({
    userIdIdx: uniqueIndex("carts_user_id_uniq").on(t.userId),
  })
);

export const cartsRelations = relations(cartsTable, ({ many }) => ({
  items: many(cartItemsTable),
}));

export type CartRow = typeof cartsTable.$inferSelect;
export type NewCartRow = typeof cartsTable.$inferInsert;

// ── cart_items ────────────────────────────────────────────────────────────────

export const cartItemsTable = pgTable(
  "cart_items",
  {
    id: primaryId(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cartsTable.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariantsTable.id, { onDelete: "cascade" }),
    /** Must be ≥ 1 */
    quantity: integer("quantity").notNull().default(1),
    ...timestamps(),
  },
  t => ({
    cartVariantUniq: uniqueIndex("cart_items_cart_variant_uniq").on(
      t.cartId,
      t.variantId
    ),
    cartIdIdx: index("cart_items_cart_id_idx").on(t.cartId),
  })
);

export const cartItemsRelations = relations(cartItemsTable, ({ one }) => ({
  cart: one(cartsTable, {
    fields: [cartItemsTable.cartId],
    references: [cartsTable.id],
  }),
  variant: one(productVariantsTable, {
    fields: [cartItemsTable.variantId],
    references: [productVariantsTable.id],
  }),
}));

export type CartItemRow = typeof cartItemsTable.$inferSelect;
export type NewCartItemRow = typeof cartItemsTable.$inferInsert;
