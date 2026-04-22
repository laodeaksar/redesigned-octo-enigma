// =============================================================================
// Order Schemas
// Used by: order-service (validation), apps/web & apps/admin (forms)
// =============================================================================

import { z } from "zod";

import {
  dateRangeSchema,
  idrAmountSchema,
  nonNegativeIntSchema,
  objectIdSchema,
  positiveIntSchema,
  sortOrderSchema,
  uuidSchema,
} from "./common.schema";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const orderStatusSchema = z.enum([
  "pending_payment",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refund_requested",
  "refunded",
]);

export const cancellationReasonSchema = z.enum([
  "payment_expired",
  "customer_request",
  "out_of_stock",
  "fraud_detected",
  "admin_action",
]);

export const shippingCourierSchema = z.enum([
  "jne",
  "jnt",
  "sicepat",
  "anteraja",
  "pos_indonesia",
  "tiki",
  "gosend",
  "grab_express",
]);

// ── Cart ──────────────────────────────────────────────────────────────────────

export const cartItemSchema = z.object({
  variantId: uuidSchema,
  quantity: positiveIntSchema.max(999, {
    message: "Quantity cannot exceed 999 per item",
  }),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: nonNegativeIntSchema.max(999),
  // quantity = 0 means remove item from cart
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

// ── Shipping Rate Query ───────────────────────────────────────────────────────

export const shippingRateQuerySchema = z.object({
  originCity: z.string().min(1),
  destinationCity: z.string().min(1),
  weight: positiveIntSchema.describe("Total weight in grams"),
  courier: shippingCourierSchema.optional(),
});

export type ShippingRateQuery = z.infer<typeof shippingRateQuerySchema>;

// ── Create Order ──────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  items: z
    .array(cartItemSchema)
    .min(1, { message: "Order must have at least one item" })
    .max(50, { message: "Cannot order more than 50 different items at once" })
    .refine(
      (items) => {
        const ids = items.map((i) => i.variantId);
        return new Set(ids).size === ids.length;
      },
      {
        message:
          "Duplicate variant IDs are not allowed — combine quantities instead",
      },
    ),
  shippingAddressId: uuidSchema,
  courier: shippingCourierSchema,
  courierService: z
    .string()
    .min(1, { message: "Courier service is required (e.g. REG, YES)" })
    .max(20)
    .toUpperCase(),
  voucherCode: z.string().max(50).toUpperCase().trim().optional(),
  customerNote: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ── Cancel Order ──────────────────────────────────────────────────────────────

export const cancelOrderSchema = z.object({
  reason: cancellationReasonSchema,
  note: z.string().max(500).optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

// ── Admin: Update Order Status ────────────────────────────────────────────────

export const updateOrderStatusSchema = z
  .object({
    status: orderStatusSchema,
    note: z.string().max(500).optional(),
    /** Required when status = "shipped" */
    trackingNumber: z.string().max(100).optional(),
    courier: shippingCourierSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.status === "shipped") {
        return !!data.trackingNumber;
      }
      return true;
    },
    {
      message: "Tracking number is required when marking an order as shipped",
      path: ["trackingNumber"],
    },
  );

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

// ── Refund Request ────────────────────────────────────────────────────────────

export const refundReasonSchema = z.enum([
  "customer_request",
  "defective_product",
  "wrong_item",
  "item_not_received",
  "order_cancelled",
  "admin_action",
]);

export const requestRefundSchema = z.object({
  reason: refundReasonSchema,
  note: z.string().max(1000).optional(),
  imageUrls: z
    .array(z.string().url())
    .max(5, { message: "Cannot attach more than 5 evidence images" })
    .default([]),
});

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

// ── Voucher / Discount ────────────────────────────────────────────────────────

export const validateVoucherSchema = z.object({
  code: z
    .string()
    .min(3, { message: "Voucher code must be at least 3 characters" })
    .max(50)
    .toUpperCase()
    .trim(),
  orderAmount: positiveIntSchema.describe("Current subtotal in IDR"),
});

export type ValidateVoucherInput = z.infer<typeof validateVoucherSchema>;

// ── Query / Filter ────────────────────────────────────────────────────────────

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: orderStatusSchema.optional(),
  userId: uuidSchema.optional(),
  search: z
    .string()
    .max(100)
    .optional()
    .describe("Order number or customer email"),
  dateRange: dateRangeSchema.optional(),
  minTotal: idrAmountSchema.optional(),
  maxTotal: idrAmountSchema.optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "grandTotal", "orderNumber"])
    .default("createdAt"),
  sortOrder: sortOrderSchema,
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: orderStatusSchema.optional(),
});

export type MyOrdersQuery = z.infer<typeof myOrdersQuerySchema>;
