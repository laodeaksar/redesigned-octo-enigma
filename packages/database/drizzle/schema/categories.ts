// =============================================================================
// categories table
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
import { relations } from "drizzle-orm";

import { primaryId, softDelete, timestamps } from "./_helpers";
import { productsTable } from "./products";

export const categoriesTable = pgTable(
  "categories",
  {
    id: primaryId(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    /** Null = root-level category */
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => ({
    categoriesSlugIdx: index("categories_slug_idx").on(t.slug),
    categoriesParentIdIdx: index("categories_parent_id_idx").on(t.parentId),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const categoriesRelations = relations(
  categoriesTable,
  ({ one, many }) => ({
    parent: one(categoriesTable, {
      fields: [categoriesTable.parentId],
      references: [categoriesTable.id],
      relationName: "subcategories",
    }),
    children: many(categoriesTable, {
      relationName: "subcategories",
    }),
    products: many(productsTable),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type CategoryRow = typeof categoriesTable.$inferSelect;
export type NewCategoryRow = typeof categoriesTable.$inferInsert;
