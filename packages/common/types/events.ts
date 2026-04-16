// =============================================================================
// Event Types — RabbitMQ message contracts
// Used by: all services (producers & consumers)
//
// Naming convention: "<domain>.<action>" in past tense
// Exchange type: topic  |  Routing key = event name
// =============================================================================

// ── Base ──────────────────────────────────────────────────────────────────────

export interface BaseEvent<T = unknown> {
    /** Unique event ID — use for idempotency checks */
    eventId: string;
    /** ISO 8601 timestamp of when the event was emitted */
    occurredAt: string;
    /** Service that published this event */
    source: ServiceName;
    /** Event type / routing key */
    type: EventType;
    payload: T;
  }
  
  export type ServiceName =
    | "auth-service"
    | "product-service"
    | "order-service"
    | "payment-service"
    | "email-worker"
    | "api-gateway";
  
  // ── Event Types ───────────────────────────────────────────────────────────────
  
  export type EventType =
    // Auth
    | "user.registered"
    | "user.email_verified"
    | "user.password_reset_requested"
    | "user.password_changed"
    // Product
    | "product.created"
    | "product.updated"
    | "product.deleted"
    | "product.stock_low"
    | "product.out_of_stock"
    // Order
    | "order.created"
    | "order.paid"
    | "order.processing"
    | "order.shipped"
    | "order.delivered"
    | "order.completed"
    | "order.cancelled"
    | "order.refund_requested"
    // Payment
    | "payment.created"
    | "payment.succeeded"
    | "payment.failed"
    | "payment.expired"
    | "payment.refunded";
  
  // ── Auth Events ───────────────────────────────────────────────────────────────
  
  export interface UserRegisteredPayload {
    userId: string;
    email: string;
    name: string;
  }
  export type UserRegisteredEvent = BaseEvent<UserRegisteredPayload> & {
    type: "user.registered";
    source: "auth-service";
  };
  
  export interface UserEmailVerifiedPayload {
    userId: string;
    email: string;
  }
  export type UserEmailVerifiedEvent = BaseEvent<UserEmailVerifiedPayload> & {
    type: "user.email_verified";
    source: "auth-service";
  };
  
  export interface UserPasswordResetRequestedPayload {
    userId: string;
    email: string;
    resetToken: string;
    expiresAt: string;
  }
  export type UserPasswordResetRequestedEvent =
    BaseEvent<UserPasswordResetRequestedPayload> & {
      type: "user.password_reset_requested";
      source: "auth-service";
    };
  
  // ── Product Events ────────────────────────────────────────────────────────────
  
  export interface ProductStockLowPayload {
    productId: string;
    variantId: string;
    sku: string;
    currentStock: number;
    threshold: number;
  }
  export type ProductStockLowEvent = BaseEvent<ProductStockLowPayload> & {
    type: "product.stock_low";
    source: "product-service";
  };
  
  export interface ProductOutOfStockPayload {
    productId: string;
    variantId: string;
    sku: string;
  }
  export type ProductOutOfStockEvent = BaseEvent<ProductOutOfStockPayload> & {
    type: "product.out_of_stock";
    source: "product-service";
  };
  
  // ── Order Events ──────────────────────────────────────────────────────────────
  
  export interface OrderCreatedPayload {
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    grandTotal: number;
    itemCount: number;
    expiresAt: string;
  }
  export type OrderCreatedEvent = BaseEvent<OrderCreatedPayload> & {
    type: "order.created";
    source: "order-service";
  };
  
  export interface OrderPaidPayload {
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    paymentId: string;
    grandTotal: number;
    paidAt: string;
  }
  export type OrderPaidEvent = BaseEvent<OrderPaidPayload> & {
    type: "order.paid";
    source: "payment-service";
  };
  
  export interface OrderShippedPayload {
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    courier: string;
    trackingNumber: string;
    estimatedDelivery: string | null;
  }
  export type OrderShippedEvent = BaseEvent<OrderShippedPayload> & {
    type: "order.shipped";
    source: "order-service";
  };
  
  export interface OrderCancelledPayload {
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    reason: string;
    grandTotal: number;
    /** Items to have stock restored */
    items: Array<{ variantId: string; quantity: number }>;
  }
  export type OrderCancelledEvent = BaseEvent<OrderCancelledPayload> & {
    type: "order.cancelled";
    source: "order-service";
  };
  
  // ── Payment Events ────────────────────────────────────────────────────────────
  
  export interface PaymentSucceededPayload {
    paymentId: string;
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    amount: number;
    method: string;
    transactionId: string;
    paidAt: string;
  }
  export type PaymentSucceededEvent = BaseEvent<PaymentSucceededPayload> & {
    type: "payment.succeeded";
    source: "payment-service";
  };
  
  export interface PaymentExpiredPayload {
    paymentId: string;
    orderId: string;
    userId: string;
  }
  export type PaymentExpiredEvent = BaseEvent<PaymentExpiredPayload> & {
    type: "payment.expired";
    source: "payment-service";
  };
  
  // ── Union type of all events ──────────────────────────────────────────────────
  
  export type AppEvent =
    | UserRegisteredEvent
    | UserEmailVerifiedEvent
    | UserPasswordResetRequestedEvent
    | ProductStockLowEvent
    | ProductOutOfStockEvent
    | OrderCreatedEvent
    | OrderPaidEvent
    | OrderShippedEvent
    | OrderCancelledEvent
    | PaymentSucceededEvent
    | PaymentExpiredEvent;
  
  // ── Queue names ───────────────────────────────────────────────────────────────
  
  export const QUEUES = {
    EMAIL_WELCOME: "email.welcome",
    EMAIL_ORDER_CONFIRMATION: "email.order-confirmation",
    EMAIL_ORDER_SHIPPED: "email.order-shipped",
    EMAIL_ORDER_CANCELLED: "email.order-cancelled",
    EMAIL_PASSWORD_RESET: "email.password-reset",
    ORDER_PAYMENT_CONFIRMED: "order.payment-confirmed",
    ORDER_CANCEL_EXPIRED: "order.cancel-expired",
    PRODUCT_STOCK_DEDUCT: "product.stock-deduct",
    PRODUCT_STOCK_RESTORE: "product.stock-restore",
  } as const;
  
  export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
  