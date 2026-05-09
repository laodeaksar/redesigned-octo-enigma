// =============================================================================
// Order service — BullMQ email job publishers
// All functions are null-safe: they silently skip when Redis is unavailable.
// =============================================================================

import { QUEUES } from "@repo/common/events";
import type { IOrder } from "@repo/database/mongo/models";

import { enqueueEmail } from "@/config";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve customer email: prefer stored userEmail, fall back to passed-in value */
function resolveEmail(order: IOrder, fallback: string): string {
  return order.userEmail ?? fallback;
}

// ── Publishers ────────────────────────────────────────────────────────────────

export async function publishOrderCreated(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const email = resolveEmail(order, userEmail);
  await enqueueEmail(QUEUES.EMAIL_ORDER_CONFIRMATION, {
    orderId,
    orderNumber: order.orderNumber,
    email,
    expiresAt: order.expiresAt.toISOString(),
    items: order.items.map(i => ({
      name: i.product.name,
      variantName: i.product.variantName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    pricing: {
      subtotal: order.pricing.subtotal,
      shippingCost: order.pricing.shippingCost,
      discountTotal: order.pricing.discountTotal,
      taxTotal: order.pricing.taxTotal,
      grandTotal: order.pricing.grandTotal,
    },
    shipping: {
      courier: order.shipping.courier,
      service: order.shipping.service,
      address: {
        recipientName: order.shipping.address.recipientName,
        phone: order.shipping.address.phone,
        street: order.shipping.address.street,
        city: order.shipping.address.city,
        province: order.shipping.address.province,
        postalCode: order.shipping.address.postalCode,
      },
    },
  });
}

export async function publishOrderShipped(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const email = resolveEmail(order, userEmail);
  await enqueueEmail(QUEUES.EMAIL_ORDER_SHIPPED, {
    orderId,
    orderNumber: order.orderNumber,
    email,
    courier: order.shipping.courier,
    trackingNumber: order.shipping.trackingNumber,
    address: {
      recipientName: order.shipping.address.recipientName,
      city: order.shipping.address.city,
      province: order.shipping.address.province,
    },
  });
}

export async function publishOrderDelivered(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const email = resolveEmail(order, userEmail);
  await enqueueEmail(QUEUES.EMAIL_ORDER_DELIVERED, {
    orderId,
    orderNumber: order.orderNumber,
    email,
    grandTotal: order.pricing.grandTotal,
    address: {
      recipientName: order.shipping.address.recipientName,
      city: order.shipping.address.city,
      province: order.shipping.address.province,
    },
  });
}

export async function publishOrderCompleted(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const email = resolveEmail(order, userEmail);
  await enqueueEmail(QUEUES.EMAIL_ORDER_COMPLETED, {
    orderId,
    orderNumber: order.orderNumber,
    email,
    grandTotal: order.pricing.grandTotal,
  });
}

export async function publishOrderCancelled(
  orderId: string,
  order: IOrder,
  userEmail: string
): Promise<void> {
  const email = resolveEmail(order, userEmail);
  await enqueueEmail(QUEUES.EMAIL_ORDER_CANCELLED, {
    orderId,
    orderNumber: order.orderNumber,
    email,
    grandTotal: order.pricing.grandTotal,
    reason: order.cancellationReason,
  });
}

export async function publishOrderProcessing(_orderId: string): Promise<void> {
  // Processing state has no customer-facing email — payment confirmation
  // is handled by the payment-service flow.
}
