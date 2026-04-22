// =============================================================================
// Order Types
// Used by: order-service, payment-service, apps/web, apps/admin
// Stored in: MongoDB (document model)
// =============================================================================

import type { AddressSummary } from "./user";
import type { ProductSnapshot } from "./product";

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
  unitPrice: number; // price per unit at time of order (IDR)
  subtotal: number; // unitPrice × quantity
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
  courier: ShippingCourier;
  service: string; // e.g. "REG", "YES", "OKE"
  trackingNumber: string | null;
  estimatedDays: number;
  cost: number; // shipping cost in IDR
  address: AddressSummary;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface OrderPricing {
  subtotal: number; // sum of all item subtotals
  shippingCost: number;
  discountTotal: number; // sum of all discounts applied
  taxTotal: number; // e.g. PPN 11%
  grandTotal: number; // final amount charged
}

// ── Discount / Voucher ────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";

export interface AppliedDiscount {
  code: string;
  type: DiscountType;
  value: number;
  amount: number; // actual IDR deducted
}

// ── Status History ────────────────────────────────────────────────────────────

export interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: Date;
  note: string | null;
  actorId: string | null; // userId or "system"
}

// ── Core Entity ───────────────────────────────────────────────────────────────

/** Full Order document as stored in MongoDB */
export interface Order {
  id: string; // MongoDB ObjectId as string
  orderNumber: string; // Human-readable: "ORD-20240415-0001"
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  shipping: ShippingInfo;
  pricing: OrderPricing;
  discounts: AppliedDiscount[];
  paymentId: string | null; // reference to payment-service record
  statusHistory: OrderStatusEvent[];
  cancellationReason: CancellationReason | null;
  cancellationNote: string | null;
  customerNote: string | null;
  expiresAt: Date; // auto-cancel deadline if unpaid
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight version for list views */
export interface OrderSummary {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  itemCount: number;
  grandTotal: number;
  primaryItemName: string;
  primaryItemImageUrl: string | null;
  createdAt: Date;
}

// ── Cart (pre-order, lives in frontend/Redis) ─────────────────────────────────

export interface CartItem {
  variantId: string;
  quantity: number;
  /** Populated on the frontend from product-service */
  product?: ProductSnapshot;
}

export interface Cart {
  userId: string | null; // null = guest cart
  sessionId: string;
  items: CartItem[];
  updatedAt: Date;
}
