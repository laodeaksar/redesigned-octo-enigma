// =============================================================================
// Wishlist repository
// =============================================================================

import { eq, and, inArray, desc, isNull, sql } from "drizzle-orm";

import {
  wishlistsTable,
  productsTable,
  productVariantsTable,
} from "@repo/database/drizzle/schema";

import { db } from "@/config";

export const wishlistRepository = {
  /** Add item — idempotent (conflict ignored) */
  async add(userId: string, productId: string) {
    const [row] = await db
      .insert(wishlistsTable)
      .values({ userId, productId })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  },

  /** Remove item */
  async remove(userId: string, productId: string) {
    const [row] = await db
      .delete(wishlistsTable)
      .where(
        and(
          eq(wishlistsTable.userId, userId),
          eq(wishlistsTable.productId, productId)
        )
      )
      .returning();
    return row ?? null;
  },

  /** Toggle — return final status */
  async toggle(
    userId: string,
    productId: string
  ): Promise<{ wishlisted: boolean }> {
    const [existing] = await db
      .select({ id: wishlistsTable.id })
      .from(wishlistsTable)
      .where(
        and(
          eq(wishlistsTable.userId, userId),
          eq(wishlistsTable.productId, productId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .delete(wishlistsTable)
        .where(
          and(
            eq(wishlistsTable.userId, userId),
            eq(wishlistsTable.productId, productId)
          )
        );
      return { wishlisted: false };
    }

    await db
      .insert(wishlistsTable)
      .values({ userId, productId })
      .onConflictDoNothing();
    return { wishlisted: true };
  },

  /** Check status for a single product */
  async isWishlisted(userId: string, productId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: wishlistsTable.id })
      .from(wishlistsTable)
      .where(
        and(
          eq(wishlistsTable.userId, userId),
          eq(wishlistsTable.productId, productId)
        )
      )
      .limit(1);
    return !!row;
  },

  /** Bulk check — for product listings (avoids N+1) */
  async bulkStatus(
    userId: string,
    productIds: string[]
  ): Promise<Record<string, boolean>> {
    if (!productIds.length) return {};

    const rows = await db
      .select({ productId: wishlistsTable.productId })
      .from(wishlistsTable)
      .where(
        and(
          eq(wishlistsTable.userId, userId),
          inArray(wishlistsTable.productId, productIds)
        )
      );

    const wishlisted = new Set(rows.map((r) => r.productId));
    return Object.fromEntries(productIds.map((id) => [id, wishlisted.has(id)]));
  },

  /** User's wishlist with product summary data (for /wishlist page) */
  async findByUser(
    userId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number }
  ) {
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        wishlistId: wishlistsTable.id,
        addedAt: wishlistsTable.createdAt,
        product: {
          id: productsTable.id,
          name: productsTable.name,
          slug: productsTable.slug,
          status: productsTable.status,
          tags: productsTable.tags,
          categoryId: productsTable.categoryId,
          createdAt: productsTable.createdAt,
          lowestPrice: sql<number>`min(${productVariantsTable.price})`,
          highestPrice: sql<number>`max(${productVariantsTable.price})`,
          totalStock: sql<number>`coalesce(sum(${productVariantsTable.stock}), 0)`,
          primaryImage: sql<string | null>`(
            select url from product_images
            where product_id = ${productsTable.id}
            order by is_primary desc, sort_order asc
            limit 1
          )`,
        },
      })
      .from(wishlistsTable)
      .innerJoin(productsTable, eq(wishlistsTable.productId, productsTable.id))
      .leftJoin(
        productVariantsTable,
        and(
          eq(productVariantsTable.productId, productsTable.id),
          eq(productVariantsTable.isActive, true)
        )
      )
      .where(
        and(
          eq(wishlistsTable.userId, userId),
          isNull(productsTable.deletedAt)
        )
      )
      .groupBy(
        wishlistsTable.id,
        wishlistsTable.createdAt,
        productsTable.id,
        productsTable.name,
        productsTable.slug,
        productsTable.status,
        productsTable.tags,
        productsTable.categoryId,
        productsTable.createdAt
      )
      .orderBy(desc(wishlistsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(wishlistsTable)
      .where(eq(wishlistsTable.userId, userId));

    return { items: rows, total, page, limit };
  },
};
