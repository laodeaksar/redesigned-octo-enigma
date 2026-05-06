import { wishlistRepository } from "./wishlist.repository";
import { NotFoundError } from "@repo/common/errors";

export const wishlistService = {
  async addToWishlist(userId: string, productId: string) {
    await wishlistRepository.add(userId, productId);
    return { wishlisted: true };
  },

  async removeFromWishlist(userId: string, productId: string) {
    await wishlistRepository.remove(userId, productId);
    return { wishlisted: false };
  },

  async toggleWishlist(userId: string, productId: string) {
    return wishlistRepository.toggle(userId, productId);
  },

  async getStatus(userId: string, productId: string) {
    const wishlisted = await wishlistRepository.isWishlisted(userId, productId);
    return { productId, wishlisted };
  },

  async bulkStatus(userId: string, productIds: string[]) {
    return wishlistRepository.bulkStatus(userId, productIds);
  },

  async getWishlist(userId: string, page: number, limit: number) {
    return wishlistRepository.findByUser(userId, { page, limit });
  },
};
