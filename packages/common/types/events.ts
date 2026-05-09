// =============================================================================
// Event Payload Types — job data contracts shared between producers and workers
// Used by: all services
//
// Naming: each type describes the *data* inside a BullMQ job.
// No more BaseEvent envelope — BullMQ provides job metadata (id, timestamp, etc.)
// =============================================================================

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface WelcomeEmailJobData {
  email: string;
  name: string;
  userId: string;
}

export interface OrderConfirmationEmailJobData {
  email: string;
  expiresAt: string;
  items: Array<{
    name: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  orderId: string;
  orderNumber: string;
  pricing: {
    subtotal: number;
    shippingCost: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  shipping: {
    courier: string;
    service: string;
    address: {
      recipientName: string;
      phone: string;
      street: string;
      city: string;
      province: string;
      postalCode: string;
    };
  };
}

export interface OrderShippedEmailJobData {
  address: {
    recipientName: string;
    city: string;
    province: string;
  };
  courier: string;
  email: string;
  orderId: string;
  orderNumber: string;
  trackingNumber: string | null;
}

export interface OrderDeliveredEmailJobData {
  email: string;
  orderId: string;
  orderNumber: string;
  grandTotal: number;
  address: {
    recipientName: string;
    city: string;
    province: string;
  };
}

export interface OrderCompletedEmailJobData {
  email: string;
  orderId: string;
  orderNumber: string;
  grandTotal: number;
}

export interface OrderCancelledEmailJobData {
  email: string;
  grandTotal: number;
  orderId: string;
  orderNumber: string;
  reason: string | null;
}

export interface PasswordResetEmailJobData {
  email: string;
  expiresAt: string;
  resetToken: string;
  userId: string;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface StockDeductJobData {
  items: Array<{ variantId: string; quantity: number }>;
  orderId: string;
}

export interface StockRestoreJobData {
  items: Array<{ variantId: string; quantity: number }>;
  orderId: string;
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface OrderExpirySweepJobData {
  /** Optional: sweep a specific order. If omitted, sweeps all expired orders. */
  orderId?: string;
}

export interface OrderPaymentConfirmedJobData {
  orderId: string;
  paidAt: string;
  paymentId: string;
}

export type { QueueName } from "../events/queue-names";
// ── Queue name constant (kept for backward compat with import paths) ──────────
export { QUEUES } from "../events/queue-names";
