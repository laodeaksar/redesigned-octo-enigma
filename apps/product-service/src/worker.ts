// =============================================================================
// product-service BullMQ workers
//
// Queues consumed:
//   PRODUCT_STOCK_DEDUCT  — deduct stock when an order is placed
//                           (currently also done via HTTP, worker is the
//                            async fallback for retry durability)
//   PRODUCT_STOCK_RESTORE — restore stock when an order is cancelled
//                           (published by order-service events.ts)
// =============================================================================

import type { Job } from "bullmq";
import { createWorkers, closeWorkers, QUEUES, type Worker } from "@repo/common/events";
import type { StockDeductJobData, StockRestoreJobData } from "@repo/common/types";
import { db, redis } from "@/config";
import { getRedis } from "@/config";
import { batchDeductStock, adjustStock } from "@/modules/products/products.service";
import { invalidateProduct } from "@/lib/cache";

// ── Stock deduct processor ────────────────────────────────────────────────────

/**
 * Deduct stock for all items in an order.
 *
 * This worker acts as the durable retry layer — the primary deduction
 * still happens synchronously via HTTP in product-client.ts, but if that
 * fails or needs to be retried, BullMQ handles it here.
 *
 * Idempotency: BullMQ jobId = `stock-deduct:{orderId}` prevents double-deduct.
 */
async function processStockDeduct(job: Job<StockDeductJobData>): Promise<void> {
  const { orderId, items } = job.data;

  console.info(
    `[stock-deduct] Job ${job.id} — deducting stock for order ${orderId} (${items.length} variants)`
  );

  await batchDeductStock(db, getRedis(), { orderId, items });

  console.info(`[stock-deduct] Job ${job.id} — completed for order ${orderId}`);
}

// ── Stock restore processor ───────────────────────────────────────────────────

/**
 * Restore stock for all items in a cancelled order.
 *
 * Published by order-service when:
 *   - Customer cancels manually
 *   - Order auto-cancelled by expiry sweep
 *   - Admin cancels via dashboard
 *
 * Each item gets a positive delta adjustment via adjustStock().
 * Failures are retried with exponential backoff (configured in worker options).
 */
async function processStockRestore(job: Job<StockRestoreJobData>): Promise<void> {
  const { orderId, items } = job.data;

  console.info(
    `[stock-restore] Job ${job.id} — restoring ${items.length} variant(s) for order ${orderId}`
  );

  const affectedProductIds = new Set<string>();
  const errors: string[] = [];

  // Restore each item individually — partial success is better than all-or-nothing
  for (const item of items) {
    try {
      const updated = await adjustStock(db, getRedis(), {
        variantId: item.variantId,
        delta: item.quantity,           // positive = restore
        reason: "order_cancelled",
        referenceId: orderId,
        note: `Auto-restored on order cancellation (job ${job.id})`,
      });

      if (updated) {
        affectedProductIds.add(updated.productId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`variantId=${item.variantId}: ${msg}`);
      console.error(`[stock-restore] Failed to restore variant ${item.variantId}:`, msg);
    }
  }

  // Invalidate cache for all affected products
  await Promise.allSettled(
    [...affectedProductIds].map((id) => invalidateProduct(getRedis(), id))
  );

  // If any items failed, throw so BullMQ retries the whole job
  if (errors.length > 0) {
    throw new Error(
      `Partial restore failure for order ${orderId} — ${errors.length}/${items.length} failed:\n${errors.join("\n")}`
    );
  }

  console.info(
    `[stock-restore] Job ${job.id} — all ${items.length} variant(s) restored for order ${orderId}`
  );
}

// ── Worker factory ────────────────────────────────────────────────────────────

/**
 * Start all product-service BullMQ workers.
 * Returns worker instances for graceful shutdown.
 */
export function startWorkers(): Worker[] {
  return createWorkers(
    [
      {
        queue: QUEUES.PRODUCT_STOCK_DEDUCT,
        processor: processStockDeduct,
        options: {
          concurrency: 5,   // multiple orders can deduct stock in parallel
        },
      },
      {
        queue: QUEUES.PRODUCT_STOCK_RESTORE,
        processor: processStockRestore,
        options: {
          concurrency: 5,
        },
      },
    ],
    redis
  );
}

export { closeWorkers };

