import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, timestamps, softDelete } from "./_helpers";
import { users } from "./users";
import { products } from "./products";

export const wishlistsTable = pgTable(
  "wishlists",
  {
    ...primaryId(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => ({
    userProductUniq: uniqueIndex("wishlists_user_product_uniq").on(
      t.userId,
      t.productId
    ),
  })
);

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;
