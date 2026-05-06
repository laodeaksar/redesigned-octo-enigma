import { db } from "@repo/database";
import { wishlists, products } from "@repo/database/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

export const wishlistRepository = {
  /** Tambah item — idempotent (conflict diabaikan) */
  async add(userId: string, productId: string) {
    const [row] = await db
      .insert(wishlists)
      .values({ userId, productId })
      .onConflictDoNothing()
      .returning();
    return row ?? null; // null = sudah ada sebelumnya (fine)
  },

  /** Hapus item */
  async remove(userId: string, productId: string) {
    const [row] = await db
      .delete(wishlists)
      .where(
        and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))
      )
      .returning();
    return row ?? null;
  },

  /** Toggle — return status akhir */
  async toggle(
    userId: string,
    productId: string
  ): Promise<{ wishlisted: boolean }> {
    const existing = await db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.userId, userId),
        eq(wishlists.productId, productId)
      ),
    });

    if (existing) {
      await db
        .delete(wishlists)
        .where(
          and(eq(wishlists.userId, userId), eq(wishlists.productId, productId))
        );
      return { wishlisted: false };
    }

    await db
      .insert(wishlists)
      .values({ userId, productId })
      .onConflictDoNothing();
    return { wishlisted: true };
  },

  /** Cek status satu produk */
  async isWishlisted(userId: string, productId: string): Promise<boolean> {
    const row = await db.query.wishlists.findFirst({
      where: and(
        eq(wishlists.userId, userId),
        eq(wishlists.productId, productId)
      ),
      columns: { id: true },
    });
    return !!row;
  },

  /** Bulk check — untuk product listing (hindari N+1) */
  async bulkStatus(
    userId: string,
    productIds: string[]
  ): Promise<Record<string, boolean>> {
    if (!productIds.length) return {};

    const rows = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          inArray(wishlists.productId, productIds)
        )
      );

    const wishlisted = new Set(rows.map((r) => r.productId));
    return Object.fromEntries(productIds.map((id) => [id, wishlisted.has(id)]));
  },

  /** Daftar wishlist user beserta data produk (untuk halaman /wishlist) */
  async findByUser(
    userId: string,
    { page = 1, limit = 20 }: { page?: number; limit?: number }
  ) {
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        wishlistId: wishlists.id,
        addedAt: wishlists.createdAt,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          imageUrl: products.imageUrl,
          stock: products.stock,
        },
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));

    return { items: rows, total: count, page, limit };
  },
};
