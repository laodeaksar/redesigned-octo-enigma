// =============================================================================
// Payment service — BullMQ job publishers + order-service HTTP callback
// =============================================================================

import { addUniqueJob } from "@repo/common/events";
import { ServiceUnavailableError } from "@repo/common/errors";
import { queues, ORDER_SERVICE_URL } from "@/config";
import type { PaymentRow } from "@repo/database/drizzle/schema";

// ── Notify order-service after payment confirmed ──────────────────────────────
// Direct HTTP (not a queue) — synchronous confirmation before webhook ack

export async function notifyOrderPaid(
  orderId: string,
  paymentId: string,
  paidAt: Date
): Promise<void> {
  let res: Response;

  try {
    res = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}/paid`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-service": "payment-service",
      },
      body: JSON.stringify({
        paymentId,
        paidAt: paidAt.toISOString(),
      }),
    });
  } catch (err) {
    throw new ServiceUnavailableError("order-service", err);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new ServiceUnavailableError(
      `order-service responded ${res.status}: ${JSON.stringify(body)}`
    );
  }
}

// ── Payment events published as BullMQ jobs ───────────────────────────────────
// These are fire-and-forget — they don't block the webhook response.

export async function publishPaymentSucceeded(
  payment: PaymentRow,
  _userEmail: string
): Promise<void> {
  // Order confirmation email is already queued by order-service when order is created.
  // Payment success triggers order-service transition via notifyOrderPaid (HTTP above).
  // No additional email job needed here — avoiding duplicate confirmation emails.
  void payment; // used for logging/analytics in full implementation
}

export async function publishPaymentExpired(payment: PaymentRow): Promise<void> {
  // Payment expiry is handled by order-service expiry sweep (BullMQ recurring job).
  // Nothing extra needed from payment-service side.
  void payment;
}

export async function publishPaymentRefunded(
  payment: PaymentRow,
  _amount: number
): Promise<void> {
  // Refund notification email can be added here when email template is ready.
  void payment;
}

