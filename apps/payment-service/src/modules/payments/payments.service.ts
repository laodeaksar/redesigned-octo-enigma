// =============================================================================
// Payments service — full lifecycle: create → webhook → refund
// =============================================================================

import { randomUUID } from "node:crypto";

import {
  NotFoundError,
  PaymentAlreadyProcessedError,
  OrderNotPayableError,
  ForbiddenError,
  PaymentGatewayError,
} from "@repo/common/errors";
import type {
  CreatePaymentInput,
  MidtransNotificationInput,
  CreateRefundInput,
  ListPaymentsQuery,
} from "@repo/common/schemas";

import * as repo from "./payments.repository";
import {
  createSnapTransaction,
  verifyMidtransSignature,
  parsePaymentMethod,
  createRefund as midtransRefund,
} from "@/lib/midtrans";
import {
  publishPaymentSucceeded,
  publishPaymentExpired,
  publishPaymentRefunded,
  notifyOrderPaid,
} from "@/lib/events";
import { env, type DB } from "@/config";

// ── Create Payment ────────────────────────────────────────────────────────────

export async function createPayment(
  db: DB,
  userId: string,
  userEmail: string,
  input: CreatePaymentInput
) {
  // Prevent duplicate payment for the same order
  const existing = await repo.findPaymentByOrderId(db, input.orderId);
  if (existing) {
    if (existing.status === "settlement" || existing.status === "capture") {
      throw new PaymentAlreadyProcessedError();
    }
    // Return existing pending payment (idempotent)
    if (existing.status === "pending") {
      return existing;
    }
  }

  // Build Midtrans order ID — must be unique per attempt
  const midtransOrderId = `PAY-${input.orderId}-${Date.now()}`;

  // Create expiry timestamp — payment must complete within ORDER_EXPIRY window
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Create Snap transaction
  const snap = await createSnapTransaction({
    orderId: midtransOrderId,
    grossAmount: 0, // Will be updated from order data in a full implementation
    customerDetails: {
      firstName: userEmail.split("@")[0] ?? "Customer",
      email: userEmail,
    },
    itemDetails: [],
    notificationUrl: env.PAYMENT_WEBHOOK_URL,
    expiryMinutes: 60,
  });

  // Persist payment record
  const payment = await repo.createPayment(db, {
    orderId: input.orderId,
    userId,
    status: "pending",
    method: null,
    amount: 0, // Set from order total in full implementation
    currency: "IDR",
    midtransOrderId,
    snapToken: snap.token,
    snapRedirectUrl: snap.redirectUrl,
    expiresAt,
  });

  return payment;
}

// ── Handle Midtrans Webhook Notification ──────────────────────────────────────

/**
 * Process an incoming Midtrans HTTP notification.
 * This is idempotent — safe to call multiple times for the same notification.
 *
 * Midtrans docs: https://docs.midtrans.com/reference/http-notification
 */
export async function handleWebhook(
  db: DB,
  notification: MidtransNotificationInput
) {
  // 1. Verify signature to prevent spoofed webhooks
  if (!verifyMidtransSignature(notification)) {
    throw new PaymentGatewayError("Invalid webhook signature");
  }

  // 2. Find the payment by Midtrans order ID
  const payment = await repo.findPaymentByMidtransOrderId(
    db,
    notification.order_id
  );

  if (!payment) {
    // Midtrans might send notifications for orders we don't know about
    // (e.g. during testing). Log and return 200 to prevent retries.
    console.warn(
      `[webhook] Payment not found for Midtrans order: ${notification.order_id}`
    );
    return { processed: false, reason: "payment_not_found" };
  }

  // 3. Map Midtrans status → our status
  const { transaction_status, fraud_status } = notification;

  const newStatus = mapMidtransStatus(transaction_status, fraud_status);
  const paymentMethod = parsePaymentMethod(notification);
  const transactionId = notification.transaction_id;
  const grossAmount = parseInt(notification.gross_amount, 10);

  // 4. Build payment method details (VA, e-wallet, cstore)
  const { virtualAccount, eWallet, cStore } = extractPaymentDetails(notification);

  // 5. Update payment record
  const paidAt =
    newStatus === "settlement" || newStatus === "capture"
      ? new Date()
      : payment.paidAt;

  await repo.updatePayment(db, payment.id, {
    status: newStatus,
    method: paymentMethod as PaymentRow["method"],
    transactionId,
    amount: grossAmount,
    virtualAccount,
    eWallet,
    cStore,
    midtransRawNotification: notification as Record<string, unknown>,
    paidAt,
  });

  const updated = await repo.findPaymentById(db, payment.id);
  if (!updated) return { processed: false, reason: "update_failed" };

  // 6. Fire side effects based on new status
  if (newStatus === "settlement" || newStatus === "capture") {
    // Notify order-service synchronously (order must transition before we ack)
    await notifyOrderPaid(payment.orderId, payment.id, paidAt!);
    // Publish event for email, analytics, etc.
    await publishPaymentSucceeded(updated, "");
  } else if (newStatus === "expire" || newStatus === "cancel") {
    await publishPaymentExpired(updated);
  }

  return { processed: true, status: newStatus, paymentId: payment.id };
}

// ── Get Payment ───────────────────────────────────────────────────────────────

export async function getPaymentById(
  db: DB,
  paymentId: string,
  requesterId: string,
  requesterRole: string
) {
  const payment = await repo.findPaymentById(db, paymentId);
  if (!payment) throw new NotFoundError("Payment");

  if (requesterRole === "customer" && payment.userId !== requesterId) {
    throw new ForbiddenError();
  }

  return payment;
}

export async function getPaymentByOrderId(
  db: DB,
  orderId: string,
  requesterId: string,
  requesterRole: string
) {
  const payment = await repo.findPaymentByOrderId(db, orderId);
  if (!payment) throw new NotFoundError("Payment");

  if (requesterRole === "customer" && payment.userId !== requesterId) {
    throw new ForbiddenError();
  }

  return payment;
}

export async function listPayments(db: DB, query: ListPaymentsQuery) {
  return repo.listPayments(db, query);
}

// ── Refund ────────────────────────────────────────────────────────────────────

export async function requestRefund(
  db: DB,
  input: CreateRefundInput
) {
  const payment = await repo.findPaymentById(db, input.paymentId);
  if (!payment) throw new NotFoundError("Payment");

  if (payment.status !== "settlement" && payment.status !== "capture") {
    throw new OrderNotPayableError(payment.status);
  }

  if (!payment.transactionId) {
    throw new PaymentGatewayError("Payment has no Midtrans transaction ID");
  }

  const refundAmount = input.amount ?? payment.amount;

  // Call Midtrans refund API
  const refundKey = `REFUND-${payment.id}-${Date.now()}`;
  const refundResult = await midtransRefund({
    midtransOrderId: payment.midtransOrderId,
    refundKey,
    amount: refundAmount,
    reason: input.reason,
  });

  // Persist refund record
  const refund = await repo.createRefund(db, {
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: refundAmount,
    reason: input.reason,
    note: input.note ?? null,
    midtransRefundId: String(refundResult["refund_key"] ?? refundKey),
    status: "pending",
  });

  // Update payment status
  const newStatus =
    refundAmount >= payment.amount ? "refund" : "partial_refund";

  await repo.updatePayment(db, payment.id, { status: newStatus });

  // Publish event
  await publishPaymentRefunded(payment, refundAmount);

  return refund;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type PaymentRow = Awaited<ReturnType<typeof repo.findPaymentById>>;

/**
 * Map Midtrans transaction_status + fraud_status → our PaymentStatus enum.
 */
function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): string {
  switch (transactionStatus) {
    case "capture":
      // Credit card: captured but not yet settled
      if (fraudStatus === "challenge") return "challenge";
      return "capture";
    case "settlement":
      return "settlement";
    case "pending":
      return "pending";
    case "deny":
      return "deny";
    case "cancel":
      return "cancel";
    case "expire":
      return "expire";
    case "failure":
      return "failure";
    case "refund":
      return "refund";
    case "partial_refund":
      return "partial_refund";
    default:
      return "pending";
  }
}

/**
 * Extract payment method-specific detail fields from notification.
 */
function extractPaymentDetails(notification: MidtransNotificationInput) {
  const { payment_type } = notification;

  let virtualAccount: { bank: string; vaNumber: string; expiresAt: string } | null = null;
  let eWallet: { provider: string; qrCodeUrl: string | null; deepLinkUrl: string | null; expiresAt: string } | null = null;
  let cStore: { store: "indomaret" | "alfamart"; paymentCode: string; expiresAt: string } | null = null;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (payment_type === "bank_transfer" || payment_type === "echannel") {
    const va = notification.va_numbers?.[0];
    if (va) {
      virtualAccount = {
        bank: va.bank,
        vaNumber: va.va_number,
        expiresAt,
      };
    }
  }

  if (["gopay", "shopeepay", "dana", "ovo", "qris"].includes(payment_type)) {
    eWallet = {
      provider: payment_type,
      qrCodeUrl: null,
      deepLinkUrl: null,
      expiresAt,
    };
  }

  if (payment_type === "cstore") {
    const store = notification.store?.toLowerCase() ?? "";
    cStore = {
      store: store.includes("alfa") ? "alfamart" : "indomaret",
      paymentCode: notification.payment_code ?? "",
      expiresAt,
    };
  }

  return { virtualAccount, eWallet, cStore };
}

