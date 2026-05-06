// =============================================================================
// Order service — BullMQ job publishers (no-ops when Redis unavailable)
// =============================================================================

import type {
  OrderConfirmationEmailJobData,
  OrderShippedEmailJobData,
  OrderCancelledEmailJobData,
  StockRestoreJobData,
} from "@repo/common/types";
import type { IOrder } from "@repo/database/mongo/models";

export async function publishOrderCreated(
  _orderId: string,
  _order: IOrder,
  _userEmail: string
): Promise<void> {
  // No-op: BullMQ/Redis not available in this environment
}

export async function publishOrderShipped(
  _orderId: string,
  _order: IOrder,
  _userEmail: string
): Promise<void> {
  // No-op: BullMQ/Redis not available in this environment
}

export async function publishOrderCancelled(
  _orderId: string,
  _order: IOrder,
  _userEmail: string
): Promise<void> {
  // No-op: BullMQ/Redis not available in this environment
}

export async function publishOrderProcessing(_orderId: string): Promise<void> {
  // No-op
}
