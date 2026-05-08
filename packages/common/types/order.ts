// =============================================================================
// Order Types
// Used by: order-service, payment-service, apps/web, apps/admin
// Stored in: MongoDB (document model)
// =============================================================================

import type { ProductSnapshot } from "./product";
import type { AddressSummary } from "./user";

// ── Enums ─────────────────────────────────────────────────────────────────────

/**
 * Full order lifecycle:
 *
 *   PENDING_PAYMENT
 *       │  (payment confirmed via Midtrans webhook)
 *   PROCESSING
 *       │  (admin marks as shipped)
 *   SHIPPED
 *       │  (delivery confirmed or auto after N days)
 *   DELIVERED
 *       │  (customer confirms or auto after N days)
 *   COMPLETED
 *
 *   Any stage → CANCELLED  (stock restored)
 *   DELIVERED  → REFUND_REQUESTED → REFUNDED
 */
export type OrderStatus =
  | "pending_payment"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refund_requested"
  | "refunded";

export type CancellationReason =
  | "payment_expired"
  | "customer_request"
  | "out_of_stock"
  | "fraud_detected"
  | "admin_action";

// ── Line Items ────────────────────────────────────────────────────────────────

export interface OrderItem {
  /** Snapshot of product/variant at time of purchase */
  product: ProductSnapshot;
  quantity: number;
  subtotal: number; // unitPrice × quantity
  unitPrice: number; // price per unit at time of order (IDR)
}

// ── Shipping ──────────────────────────────────────────────────────────────────

export type ShippingCourier =
  | "jne"
  | "jnt"
  | "sicepat"
  | "anteraja"
  | "pos_indonesia"
  | "tiki"
  | "gosend"
  | "grab_express";

export interface ShippingInfo {
  address: AddressSummary;
  cost: number; // shipping cost in IDR
  courier: ShippingCourier;
  deliveredAt: Date | null;
  estimatedDays: number;
  service: string; // e.g. "REG", "YES", "OKE"
  shippedAt: Date | null;
  trackingNumber: string | null;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface OrderPricing {
  discountTotal: number; // sum of all discounts applied
  grandTotal: number; // final amount charged
  shippingCost: number;
  subtotal: number; // sum of all item subtotals
  taxTotal: number; // e.g. PPN 11%
}

// ── Discount / Voucher ────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";

export interface AppliedDiscount {
  amount: number; // actual IDR deducted
  code: string;
  type: DiscountType;
  value: number;
}

// ── Status History ────────────────────────────────────────────────────────────

export interface OrderStatusEvent {
  actorId: string | null; // userId or "system"
  note: string | null;
  status: OrderStatus;
  timestamp: Date;
}

// ── Core Entity ───────────────────────────────────────────────────────────────

/** Full Order document as stored in MongoDB */
export interface Order {
  cancellationNote: string | null;
  cancellationReason: CancellationReason | null;
  createdAt: Date;
  customerNote: string | null;
  discounts: AppliedDiscount[];
  expiresAt: Date; // auto-cancel deadline if unpaid
  id: string; // MongoDB ObjectId as string
  items: OrderItem[];
  orderNumber: string; // Human-readable: "ORD-20240415-0001"
  paymentId: string | null; // reference to payment-service record
  pricing: OrderPricing;
  shipping: ShippingInfo;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  updatedAt: Date;
  userId: string;
}

/** Lightweight version for list views */
export interface OrderSummary {
  createdAt: Date;
  grandTotal: number;
  id: string;
  itemCount: number;
  orderNumber: string;
  primaryItemImageUrl: string | null;
  primaryItemName: string;
  status: OrderStatus;
  userId: string;
}

// ── Cart (pre-order, lives in frontend/Redis) ─────────────────────────────────

export interface CartItem {
  /** Populated on the frontend from product-service */
  product?: ProductSnapshot;
  quantity: number;
  variantId: string;
}

export interface Cart {
  items: CartItem[];
  sessionId: string;
  updatedAt: Date;
  userId: string | null; // null = guest cart
}
