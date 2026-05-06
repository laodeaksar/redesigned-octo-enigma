import { pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_helpers";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const wishlistsTable = pgTable(
  "wishlists",
  {
    id: primaryId(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => ({
    userProductUniq: uniqueIndex("wishlists_user_product_uniq").on(
      t.userId,
      t.productId
    ),
  })
);

export type Wishlist = typeof wishlistsTable.$inferSelect;
export type NewWishlist = typeof wishlistsTable.$inferInsert;
