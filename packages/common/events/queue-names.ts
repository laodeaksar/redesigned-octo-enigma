// =============================================================================
// Queue names — single source of truth for all BullMQ queue names
// =============================================================================

export const QUEUES = {
  // ── Email ──────────────────────────────────────────────────────────────────
  EMAIL_WELCOME:             "email.welcome",
  EMAIL_ORDER_CONFIRMATION:  "email.order-confirmation",
  EMAIL_ORDER_SHIPPED:       "email.order-shipped",
  EMAIL_ORDER_CANCELLED:     "email.order-cancelled",
  EMAIL_PASSWORD_RESET:      "email.password-reset",

  // ── Product ────────────────────────────────────────────────────────────────
  PRODUCT_STOCK_DEDUCT:      "product.stock-deduct",
  PRODUCT_STOCK_RESTORE:     "product.stock-restore",

  // ── Order ──────────────────────────────────────────────────────────────────
  ORDER_PAYMENT_CONFIRMED:   "order.payment-confirmed",
  ORDER_CANCEL_EXPIRED:      "order.cancel-expired",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

