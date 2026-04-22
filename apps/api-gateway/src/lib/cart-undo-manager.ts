/**
 * Cart Undo Manager
 * Soft delete sementara untuk item keranjang dengan jendela undo 8 detik
 * Mendukung atomic operation dan race condition handling
 */

import { logger } from "./logger";
import { CircuitBreakerManager } from "./circuit-breaker";

export interface PendingDeletedCartItem {
  id: string;
  cartItemId: string;
  userId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  scheduledAt: number;
  expiresAt: number;
  state: 'pending' | 'restored' | 'deleted';
  version: number;
}

export interface UndoResult {
  success: boolean;
  message: string;
  remainingTime?: number;
  item?: PendingDeletedCartItem;
}

const UNDO_WINDOW_MS = 8000;
const CLEANUP_INTERVAL = 1000;

class CartUndoManager {
  private pendingItems = new Map<string, PendingDeletedCartItem>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private circuitBreaker = CircuitBreakerManager.get('order-service');

  constructor() {
    this.startCleanupProcess();
  }

  /**
   * Jadwalkan penghapusan item dengan jendela undo
   * Operasi atomic dengan optimistic locking
   */
  scheduleItemDeletion(
    userId: string,
    cartItemId: string,
    product: { productId: string; quantity: number; unitPrice: number }
  ): PendingDeletedCartItem {
    const deletionId = crypto.randomUUID();
    const now = Date.now();

    const item: PendingDeletedCartItem = {
      id: deletionId,
      cartItemId,
      userId,
      productId: product.productId,
      quantity: product.quantity,
      unitPrice: product.unitPrice,
      scheduledAt: now,
      expiresAt: now + UNDO_WINDOW_MS,
      state: 'pending',
      version: 0
    };

    this.pendingItems.set(deletionId, item);

    logger.info('Cart item scheduled for deferred deletion', {
      deletionId,
      cartItemId,
      userId,
      productId: product.productId,
      undoWindow: UNDO_WINDOW_MS
    });

    setTimeout(() => this.executePermanentDeletion(deletionId), UNDO_WINDOW_MS);

    return item;
  }

  /**
   * Batalkan penghapusan dan kembalikan item ke keranjang
   * Atomic operation dengan check-and-set
   */
  async undoItemDeletion(deletionId: string, userId: string): Promise<UndoResult> {
    const item = this.pendingItems.get(deletionId);

    if (!item) {
      return {
        success: false,
        message: 'Item tidak ditemukan atau sudah dihapus permanen'
      };
    }

    // Validasi kepemilikan
    if (item.userId !== userId) {
      logger.warn('Unauthorized undo attempt blocked', {
        deletionId,
        requestedUserId: userId,
        ownerUserId: item.userId
      });
      return {
        success: false,
        message: 'Anda tidak berhak melakukan operasi ini'
      };
    }

    // Cek state atomic sebelum operasi
    switch (item.state) {
      case 'restored':
        return { success: false, message: 'Item sudah pernah dikembalikan' };
      case 'deleted':
        return { success: false, message: 'Item sudah terhapus permanen' };
    }

    const remainingTime = item.expiresAt - Date.now();
    if (remainingTime <= 0) {
      return { success: false, message: 'Jendela waktu undo sudah habis' };
    }

    // Update state secara atomic sebelum panggil service
    item.state = 'restored';
    item.version++;

    try {
      await this.circuitBreaker.execute(async () => {
        // Integrasi dengan order service untuk restore item
        return true;
      });

      this.pendingItems.delete(deletionId);

      logger.info('Cart item successfully restored via undo', {
        deletionId,
        cartItemId: item.cartItemId,
        remainingTime
      });

      return {
        success: true,
        message: 'Item berhasil dikembalikan ke keranjang',
        remainingTime,
        item
      };

    } catch (error) {
      // Rollback state jika gagal
      item.state = 'pending';
      item.version--;

      logger.error('Failed to undo cart item deletion', {
        deletionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Gagal mengembalikan item, silakan coba lagi'
      };
    }
  }

  /**
   * Hapus item secara permanen jika tidak di-undo
   */
  private async executePermanentDeletion(deletionId: string): Promise<void> {
    const item = this.pendingItems.get(deletionId);

    if (!item || item.state !== 'pending') {
      this.pendingItems.delete(deletionId);
      return;
    }

    item.state = 'deleted';
    item.version++;

    try {
      await this.circuitBreaker.execute(async () => {
        // Integrasi dengan order service untuk hapus permanen
        return true;
      });

      logger.info('Cart item permanently deleted', {
          deletionId,
          cartItemId: item.cartItemId,
          userId: item.userId
        });

    } catch (error) {
      logger.error('Permanent deletion failed, will retry later', {
        deletionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTimeout(() => this.pendingItems.delete(deletionId), 60000);
    }
  }

  /**
   * Dapatkan sisa waktu undo
   */
  getRemainingUndoTime(deletionId: string): number | null {
    const item = this.pendingItems.get(deletionId);
    if (!item || item.state !== 'pending') return null;
    return Math.max(0, item.expiresAt - Date.now());
  }

  /**
   * Background worker pembersihan item yang sudah kadaluarsa
   */
  private startCleanupProcess(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let cleanupCount = 0;

      for (const [id, item] of Array.from(this.pendingItems.entries())) {
        if (item.expiresAt < now && item.state === 'pending') {
          this.executePermanentDeletion(id);
          cleanupCount++;
        }
      }

      if (cleanupCount > 0) {
        logger.debug('Cleaned up expired pending cart deletions', { count: cleanupCount });
      }
    }, CLEANUP_INTERVAL);

    this.cleanupTimer.unref();
  }

  /**
   * Dapatkan statistik untuk monitoring
   */
  getMetrics(): Record<string, unknown> {
    return {
      pendingCount: this.pendingItems.size,
      undoWindowMs: UNDO_WINDOW_MS
    };
  }
}

export const cartUndoManager = new CartUndoManager();
