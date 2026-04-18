// =============================================================================
// product_images table
// Managed by: product-service
// =============================================================================

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { productsTable } from "./products";

export const productImagesTable = pgTable(
  "product_images",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps(),
  },
  (t) => ({
    productImagesProductIdIdx: index("product_images_product_id_idx").on(
      t.productId,
    ),
    productImagesIsPrimaryIdx: index("product_images_is_primary_idx").on(
      t.isPrimary,
    ),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const productImagesRelations = relations(
  productImagesTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [productImagesTable.productId],
      references: [productsTable.id],
    }),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductImageRow = typeof productImagesTable.$inferSelect;
export type NewProductImageRow = typeof productImagesTable.$inferInsert;
