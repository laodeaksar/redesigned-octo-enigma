// =============================================================================
// Event Payload Types — job data contracts shared between producers and workers
// Used by: all services
//
// Naming: each type describes the *data* inside a BullMQ job.
// No more BaseEvent envelope — BullMQ provides job metadata (id, timestamp, etc.)
// =============================================================================

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface WelcomeEmailJobData {
  userId: string;
  email: string;
  name: string;
}

export interface OrderConfirmationEmailJobData {
  orderId: string;
  orderNumber: string;
  email: string;
  items: Array<{
    name: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
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
  expiresAt: string;
}

export interface OrderShippedEmailJobData {
  orderId: string;
  orderNumber: string;
  email: string;
  courier: string;
  trackingNumber: string | null;
  address: {
    recipientName: string;
    city: string;
    province: string;
  };
}

export interface OrderCancelledEmailJobData {
  orderId: string;
  orderNumber: string;
  email: string;
  reason: string | null;
  grandTotal: number;
}

export interface PasswordResetEmailJobData {
  userId: string;
  email: string;
  resetToken: string;
  expiresAt: string;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface StockDeductJobData {
  orderId: string;
  items: Array<{ variantId: string; quantity: number }>;
}

export interface StockRestoreJobData {
  orderId: string;
  items: Array<{ variantId: string; quantity: number }>;
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface OrderExpirySweepJobData {
  /** Optional: sweep a specific order. If omitted, sweeps all expired orders. */
  orderId?: string;
}

export interface OrderPaymentConfirmedJobData {
  orderId: string;
  paymentId: string;
  paidAt: string;
}

// ── Queue name constant (kept for backward compat with import paths) ──────────
export { QUEUES } from "../events/queue-names";
export type { QueueName } from "../events/queue-names";
