// =============================================================================
// product_reviews table
// Managed by: product-service
// =============================================================================

import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const productReviewsTable = pgTable(
  "product_reviews",
  {
    id: primaryId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** orderId from order-service (MongoDB ObjectId as string) */
    orderId: varchar("order_id", { length: 24 }).notNull(),
    rating: smallint("rating").notNull(),
    title: varchar("title", { length: 150 }),
    body: text("body"),
    /** S3 image URLs for review photos */
    imageUrls: text("image_urls")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isVerifiedPurchase: boolean("is_verified_purchase")
      .notNull()
      .default(false),
    ...timestamps(),
  },
  (t) => ({
    // Indeks komposit (beberapa kolom sekaligus)
    productReviewsUniqueIdx: index("product_reviews_unique_idx").on(
      t.productId,
      t.userId,
      t.orderId,
    ),

    // Indeks kolom tunggal
    productReviewsProductIdIdx: index("product_reviews_product_id_idx").on(
      t.productId,
    ),
    productReviewsUserIdIdx: index("product_reviews_user_id_idx").on(t.userId),
    productReviewsRatingIdx: index("product_reviews_rating_idx").on(t.rating),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const productReviewsRelations = relations(
  productReviewsTable,
  ({ one }) => ({
    product: one(productsTable, {
      fields: [productReviewsTable.productId],
      references: [productsTable.id],
    }),
    user: one(usersTable, {
      fields: [productReviewsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductReviewRow = typeof productReviewsTable.$inferSelect;
export type NewProductReviewRow = typeof productReviewsTable.$inferInsert;
