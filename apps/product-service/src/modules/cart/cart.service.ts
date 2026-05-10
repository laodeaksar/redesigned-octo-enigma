// =============================================================================
// Cart service
// =============================================================================

import { BadRequestError, NotFoundError } from "@repo/common/errors";
import { cartRepository, type MergeItem } from "./cart.repository";

const MAX_QUANTITY = 99;
const MAX_ITEMS    = 50;

export const cartService = {
  async getCart(userId: string) {
    const items = await cartRepository.getCart(userId);
    const subtotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, subtotal, itemCount };
  },

  async addItem(userId: string, variantId: string, quantity: number) {
    if (quantity < 1 || quantity > MAX_QUANTITY) {
      throw new BadRequestError(
        `Jumlah harus antara 1 dan ${MAX_QUANTITY}`
      );
    }

    // Check total item count
    const currentCount = await cartRepository.getCount(userId);
    if (currentCount >= MAX_ITEMS) {
      throw new BadRequestError(
        `Keranjang sudah penuh (maksimal ${MAX_ITEMS} item)`
      );
    }

    const item = await cartRepository.addItem(userId, variantId, quantity);
    if (!item) {
      throw new NotFoundError("Variant produk tidak ditemukan");
    }
    return item;
  },

  async updateQuantity(userId: string, variantId: string, quantity: number) {
    if (quantity < 1 || quantity > MAX_QUANTITY) {
      throw new BadRequestError(
        `Jumlah harus antara 1 dan ${MAX_QUANTITY}`
      );
    }

    const item = await cartRepository.updateQuantity(userId, variantId, quantity);
    if (!item) {
      throw new NotFoundError("Item tidak ditemukan di keranjang");
    }
    return item;
  },

  async removeItem(userId: string, variantId: string) {
    await cartRepository.removeItem(userId, variantId);
    return { removed: true };
  },

  async clearCart(userId: string) {
    await cartRepository.clearCart(userId);
    return { cleared: true };
  },

  async mergeCart(userId: string, items: MergeItem[]) {
    const safeItems = items
      .filter(i => i.quantity >= 1)
      .map(i => ({ ...i, quantity: Math.min(i.quantity, MAX_QUANTITY) }))
      .slice(0, MAX_ITEMS);

    const allItems = await cartRepository.mergeItems(userId, safeItems);
    const subtotal = allItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const itemCount = allItems.reduce((sum, i) => sum + i.quantity, 0);
    return { items: allItems, subtotal, itemCount };
  },

  async getCount(userId: string) {
    const count = await cartRepository.getCount(userId);
    return { count };
  },
};
