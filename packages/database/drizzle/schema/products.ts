// =============================================================================
// products table
// Managed by: product-service
// =============================================================================

import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import {
  primaryId,
  productStatusEnum,
  softDelete,
  timestamps,
} from "./_helpers";
import { categoriesTable } from "./categories";
import { productVariantsTable } from "./product-variants";
import { productImagesTable } from "./product-images";
import { productReviewsTable } from "./product-reviews";

export const productsTable = pgTable(
  "products",
  {
    id: primaryId(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    shortDescription: varchar("short_description", { length: 500 }),
    status: productStatusEnum("status").notNull().default("draft"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id),
    /** PostgreSQL text[] for tags */
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Weight in grams — fallback when variant has no weight */
    weight: integer("weight"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    slugIdx: index("products_slug_idx").on(t.slug),
    categoryIdIdx: index("products_category_id_idx").on(t.categoryId),
    statusIdx: index("products_status_idx").on(t.status),
    //deletedAtIdx: index("products_deleted_at_idx").on(t.deletedAt),
    deletedAtIdx: index("products_deleted_at_idx")
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} IS NULL`),
    // Full-text search index pakai GIN
    //@ts-ignore
    ftsIdx: index("products_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.name} || ' ' || ${t.description})`,
    ),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.categoryId],
    references: [categoriesTable.id],
  }),
  variants: many(productVariantsTable),
  images: many(productImagesTable),
  reviews: many(productReviewsTable),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProductRow = typeof productsTable.$inferSelect;
export type NewProductRow = typeof productsTable.$inferInsert;
