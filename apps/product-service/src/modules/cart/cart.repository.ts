// =============================================================================
// Cart repository
// =============================================================================

import {
  cartItemsTable,
  cartsTable,
  productVariantsTable,
  productsTable,
} from "@repo/database/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItemWithProduct {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  variantName: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  stock: number;
  addedAt: Date;
}

export interface MergeItem {
  variantId: string;
  quantity: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get or lazily create the user's cart, return cart.id */
async function getOrCreateCart(userId: string): Promise<string> {
  const [existing] = await db
    .select({ id: cartsTable.id })
    .from(cartsTable)
    .where(eq(cartsTable.userId, userId))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await db
    .insert(cartsTable)
    .values({ userId })
    .returning({ id: cartsTable.id });

  return created!.id;
}

/** Shared rich-select for cart items with live product data */
const itemSelect = {
  id: cartItemsTable.id,
  cartId: cartItemsTable.cartId,
  variantId: cartItemsTable.variantId,
  quantity: cartItemsTable.quantity,
  addedAt: cartItemsTable.createdAt,
  // Live price from product_variants
  price: productVariantsTable.price,
  compareAtPrice: productVariantsTable.compareAtPrice,
  sku: productVariantsTable.sku,
  variantName: productVariantsTable.name,
  stock: productVariantsTable.stock,
  productId: productsTable.id,
  productName: productsTable.name,
  imageUrl: sql<string | null>`(
    SELECT url FROM product_images
    WHERE product_id = ${productsTable.id}
    ORDER BY is_primary DESC, sort_order ASC
    LIMIT 1
  )`,
};

// ── Repository ────────────────────────────────────────────────────────────────

export const cartRepository = {
  /** Get all items in a user's cart with live product data */
  async getCart(userId: string): Promise<CartItemWithProduct[]> {
    const [cart] = await db
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);

    if (!cart) {
      return [];
    }

    return db
      .select(itemSelect)
      .from(cartItemsTable)
      .innerJoin(
        productVariantsTable,
        eq(cartItemsTable.variantId, productVariantsTable.id)
      )
      .innerJoin(
        productsTable,
        eq(productVariantsTable.productId, productsTable.id)
      )
      .where(eq(cartItemsTable.cartId, cart.id));
  },

  /**
   * Add or increment an item.
   * If the variant already exists in the cart, quantity is incremented.
   */
  async addItem(
    userId: string,
    variantId: string,
    quantity: number
  ): Promise<CartItemWithProduct | null> {
    const cartId = await getOrCreateCart(userId);

    await db
      .insert(cartItemsTable)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({
        target: [cartItemsTable.cartId, cartItemsTable.variantId],
        set: {
          quantity: sql`${cartItemsTable.quantity} + ${quantity}`,
          updatedAt: new Date(),
        },
      });

    const [item] = await db
      .select(itemSelect)
      .from(cartItemsTable)
      .innerJoin(
        productVariantsTable,
        eq(cartItemsTable.variantId, productVariantsTable.id)
      )
      .innerJoin(
        productsTable,
        eq(productVariantsTable.productId, productsTable.id)
      )
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          eq(cartItemsTable.variantId, variantId)
        )
      )
      .limit(1);

    return item ?? null;
  },

  /** Set exact quantity for an existing item */
  async updateQuantity(
    userId: string,
    variantId: string,
    quantity: number
  ): Promise<CartItemWithProduct | null> {
    const [cart] = await db
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);

    if (!cart) {
      return null;
    }

    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity, updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.cartId, cart.id),
          eq(cartItemsTable.variantId, variantId)
        )
      )
      .returning({ id: cartItemsTable.id });

    if (!updated) {
      return null;
    }

    const [item] = await db
      .select(itemSelect)
      .from(cartItemsTable)
      .innerJoin(
        productVariantsTable,
        eq(cartItemsTable.variantId, productVariantsTable.id)
      )
      .innerJoin(
        productsTable,
        eq(productVariantsTable.productId, productsTable.id)
      )
      .where(
        and(
          eq(cartItemsTable.cartId, cart.id),
          eq(cartItemsTable.variantId, variantId)
        )
      )
      .limit(1);

    return item ?? null;
  },

  /** Remove a single item */
  async removeItem(userId: string, variantId: string): Promise<boolean> {
    const [cart] = await db
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);

    if (!cart) {
      return false;
    }

    const [deleted] = await db
      .delete(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cart.id),
          eq(cartItemsTable.variantId, variantId)
        )
      )
      .returning({ id: cartItemsTable.id });

    return !!deleted;
  },

  /** Remove all items from the cart (keep the cart row) */
  async clearCart(userId: string): Promise<void> {
    const [cart] = await db
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);

    if (!cart) {
      return;
    }

    await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.cartId, cart.id));
  },

  /**
   * Merge guest (localStorage) items into the server cart.
   * Strategy: for existing items, take the MAX of server vs client quantity.
   *           New items are inserted directly.
   */
  async mergeItems(userId: string, items: MergeItem[]): Promise<CartItemWithProduct[]> {
    if (!items.length) {
      return this.getCart(userId);
    }

    const cartId = await getOrCreateCart(userId);

    // Fetch existing items
    const existingItems = await db
      .select({ variantId: cartItemsTable.variantId, quantity: cartItemsTable.quantity })
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          inArray(cartItemsTable.variantId, items.map(i => i.variantId))
        )
      );

    const existingMap = new Map(existingItems.map(i => [i.variantId, i.quantity]));

    // Upsert all incoming items
    for (const item of items) {
      const serverQty = existingMap.get(item.variantId) ?? 0;
      const mergedQty = Math.max(serverQty, item.quantity);

      await db
        .insert(cartItemsTable)
        .values({ cartId, variantId: item.variantId, quantity: mergedQty })
        .onConflictDoUpdate({
          target: [cartItemsTable.cartId, cartItemsTable.variantId],
          set: {
            quantity: mergedQty,
            updatedAt: new Date(),
          },
        });
    }

    return this.getCart(userId);
  },

  /** Count items in cart */
  async getCount(userId: string): Promise<number> {
    const [cart] = await db
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.userId, userId))
      .limit(1);

    if (!cart) {
      return 0;
    }

    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${cartItemsTable.quantity}), 0)::int` })
      .from(cartItemsTable)
      .where(eq(cartItemsTable.cartId, cart.id));

    return total;
  },
};
