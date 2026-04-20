// =============================================================================
// Order service — BullMQ job publishers
// =============================================================================

import { addUniqueJob, addJob, IMPORTANT_JOB_OPTIONS } from "@repo/common/events";
import type {
  OrderConfirmationEmailJobData,
  OrderShippedEmailJobData,
  OrderCancelledEmailJobData,
  StockRestoreJobData,
} from "@repo/common/types";
import type { IOrder } from "@repo/database/mongo/models/order.model";
import { queues } from "@/config";

export async function publishOrderCreated(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const payload: OrderConfirmationEmailJobData = {
    orderId,
    orderNumber: order.orderNumber,
    email: userEmail,
    items: order.items.map((i) => ({
      name: i.product.name,
      variantName: i.product.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    pricing: order.pricing,
    shipping: {
      courier: order.shipping.courier,
      service: order.shipping.service,
      address: order.shipping.address,
    },
    expiresAt: order.expiresAt.toISOString(),
  };

  await addUniqueJob(
    queues.emailOrderConfirmation,
    payload,
    `order-confirmation:${orderId}`,
    IMPORTANT_JOB_OPTIONS
  );
}

export async function publishOrderShipped(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const payload: OrderShippedEmailJobData = {
    orderId,
    orderNumber: order.orderNumber,
    email: userEmail,
    courier: order.shipping.courier,
    trackingNumber: order.shipping.trackingNumber,
    address: {
      recipientName: order.shipping.address.recipientName,
      city: order.shipping.address.city,
      province: order.shipping.address.province,
    },
  };

  await addUniqueJob(
    queues.emailOrderShipped,
    payload,
    `order-shipped:${orderId}`
  );
}

export async function publishOrderCancelled(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const emailPayload: OrderCancelledEmailJobData = {
    orderId,
    orderNumber: order.orderNumber,
    email: userEmail,
    reason: order.cancellationReason,
    grandTotal: order.pricing.grandTotal,
  };

  const stockPayload: StockRestoreJobData = {
    orderId,
    items: order.items.map((i) => ({
      variantId: i.product.variantId,
      quantity: i.quantity,
    })),
  };

  await Promise.all([
    addUniqueJob(
      queues.emailOrderCancelled,
      emailPayload,
      `order-cancelled:${orderId}`
    ),
    addUniqueJob(
      queues.stockRestore,
      stockPayload,
      `stock-restore:${orderId}`
    ),
  ]);
}

export async function publishOrderProcessing(_orderId: string): Promise<void> {
  // No queue needed — order-service is notified synchronously via HTTP from payment-service
}

