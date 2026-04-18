// =============================================================================
// product_variants table
// Managed by: product-service
// =============================================================================

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { productsTable } from "./products";

export const productVariantsTable = pgTable(
  "product_variants",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    /** Unique stock keeping unit */
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    /** Human-readable variant label, e.g. "Red / XL" */
    name: varchar("name", { length: 200 }).notNull(),
    /**
     * Flexible key-value attributes.
     * e.g. { "color": "red", "size": "XL" }
     */
    attributes: jsonb("attributes")
      .notNull()
      .$type<Record<string, string>>()
      .default({}),
    /** Selling price in IDR (integer, no decimals) */
    price: integer("price").notNull(),
    /** Original / strikethrough price in IDR */
    compareAtPrice: integer("compare_at_price"),
    /** Current stock level */
    stock: integer("stock").notNull().default(0),
    /** Weight in grams — overrides product-level weight */
    weight: integer("weight"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => ({
    productIdIdx: index("product_variants_product_id_idx").on(t.productId),
    skuIdx: uniqueIndex("product_variants_sku_idx").on(t.sku), // sku biasanya unique
    priceIdx: index("product_variants_price_idx").on(t.price),
    stockIdx: index("product_variants_stock_idx").on(t.stock),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const productVariantsRelations = relations(
  productVariantsTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [productVariantsTable.productId],
      references: [productsTable.id],
    }),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductVariantRow = typeof productVariantsTable.$inferSelect;
export type NewProductVariantRow = typeof productVariantsTable.$inferInsert;
