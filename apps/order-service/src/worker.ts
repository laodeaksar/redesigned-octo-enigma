// =============================================================================
// order-service BullMQ workers
//
// Queues consumed:
//   ORDER_CANCEL_EXPIRED — triggered by scheduleRecurring every 5 min
//                          sweeps all pending_payment orders past expiresAt
// =============================================================================

import { createWorker, QUEUES, type Worker } from "@repo/common/events";
import { expireStaleOrders } from "@/modules/orders/orders.service";
import { redis } from "@/config";
import type { OrderExpirySweepJobData } from "@repo/common/types";

/**
 * Processor for ORDER_CANCEL_EXPIRED queue.
 *
 * Each job is a sweep — finds all orders with:
 *   status = "pending_payment" AND expiresAt < now
 * Cancels them and restores stock via product-service HTTP call.
 */
const processExpirySweep = async (
  _job: import("bullmq").Job<OrderExpirySweepJobData>
) => {
  const result = await expireStaleOrders();

  if (result.expired > 0) {
    console.info(
      `[order-expiry-worker] Cancelled ${result.expired} stale order(s)`
    );
  }
};

/**
 * Start all order-service BullMQ workers.
 * Returns worker instances for graceful shutdown.
 */
export function startWorkers(): Worker[] {
  return [
    createWorker<OrderExpirySweepJobData>(
      QUEUES.ORDER_CANCEL_EXPIRED,
      processExpirySweep,
      redis,
      {
        // Only one sweep at a time — prevent concurrent sweeps racing each other
        concurrency: 1,
      }
    ),
  ];
}

