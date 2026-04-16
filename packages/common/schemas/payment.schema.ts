// =============================================================================
// Payment Schemas
// Used by: payment-service (validation), apps/web (form)
// =============================================================================

import { z } from "zod";

import {
  dateRangeSchema,
  idrAmountSchema,
  objectIdSchema,
  positiveIdrAmountSchema,
  sortOrderSchema,
  uuidSchema,
} from "./common.schema";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const paymentStatusSchema = z.enum([
  "pending",
  "challenge",
  "capture",
  "settlement",
  "deny",
  "cancel",
  "expire",
  "failure",
  "refund",
  "partial_refund",
]);

export const paymentMethodSchema = z.enum([
  "bank_transfer_bca",
  "bank_transfer_bni",
  "bank_transfer_bri",
  "bank_transfer_mandiri",
  "bank_transfer_permata",
  "gopay",
  "shopeepay",
  "dana",
  "ovo",
  "qris",
  "credit_card",
  "cstore_indomaret",
  "cstore_alfamart",
  "akulaku",
  "kredivo",
]);

export const refundReasonSchema = z.enum([
  "customer_request",
  "defective_product",
  "wrong_item",
  "item_not_received",
  "order_cancelled",
  "admin_action",
]);

// ── Create Payment (Midtrans Snap) ────────────────────────────────────────────

export const createPaymentSchema = z.object({
  orderId: z.string().min(1, { message: "Order ID is required" }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// ── Midtrans Webhook Notification ─────────────────────────────────────────────

/**
 * Validates the raw Midtrans HTTP notification payload.
 * Signature verification happens separately in the service.
 * Reference: https://docs.midtrans.com/reference/http-notification
 */
export const midtransNotificationSchema = z.object({
  transaction_time: z.string().min(1),
  transaction_status: z.string().min(1),
  transaction_id: z.string().min(1),
  status_message: z.string(),
  status_code: z.string(),
  signature_key: z.string().min(1),
  payment_type: z.string().min(1),
  order_id: z.string().min(1),
  merchant_id: z.string().min(1),
  gross_amount: z
    .string()
    .regex(/^\d+(\.\d{2})?$/, {
      message: "gross_amount must be a numeric string (e.g. '150000.00')",
    }),
  fraud_status: z.string().optional(),
  currency: z.string().default("IDR"),
  // Bank transfer
  va_numbers: z
    .array(z.object({ bank: z.string(), va_number: z.string() }))
    .optional(),
  // E-wallet / credit card
  acquirer: z.string().optional(),
  // Credit card
  masked_card: z.string().optional(),
  bank: z.string().optional(),
  card_type: z.string().optional(),
  // QRIS
  qr_string: z.string().optional(),
  // Convenience store
  payment_code: z.string().optional(),
  store: z.string().optional(),
});

export type MidtransNotificationInput = z.infer<typeof midtransNotificationSchema>;

// ── Refund ────────────────────────────────────────────────────────────────────

export const createRefundSchema = z
  .object({
    paymentId: uuidSchema,
    amount: positiveIdrAmountSchema,
    reason: refundReasonSchema,
    note: z.string().max(500).nullable().optional(),
  });

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

/**
 * Partial refund: amount must be > 0 and ≤ original payment amount.
 * Full refund: leave amount empty — service will use original amount.
 */
export const requestRefundSchema = z.object({
  orderId: z.string().min(1),
  /** Leave undefined for a full refund */
  amount: positiveIdrAmountSchema.optional(),
  reason: refundReasonSchema,
  note: z.string().max(500).optional(),
});

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

// ── Query / Filter ────────────────────────────────────────────────────────────

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  userId: uuidSchema.optional(),
  orderId: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  minAmount: idrAmountSchema.optional(),
  maxAmount: idrAmountSchema.optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "amount", "paidAt"])
    .default("createdAt"),
  sortOrder: sortOrderSchema,
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

// ── Internal: stock deduction confirmation ────────────────────────────────────

/**
 * Sent from payment-service → order-service after payment confirmed.
 * Used to validate the internal callback payload.
 */
export const paymentConfirmedCallbackSchema = z.object({
  paymentId: uuidSchema,
  orderId: z.string().min(1),
  transactionId: z.string().min(1),
  paidAt: z.string().datetime(),
  amount: positiveIdrAmountSchema,
});

export type PaymentConfirmedCallbackInput = z.infer<
  typeof paymentConfirmedCallbackSchema
>;
