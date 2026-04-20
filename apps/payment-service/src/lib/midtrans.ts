// =============================================================================
// Midtrans client helpers
// Snap API: https://docs.midtrans.com/reference/backend-integration
// =============================================================================

import { createHash } from "node:crypto";

import { PaymentGatewayError } from "@repo/common/errors";
import type { MidtransNotification } from "@repo/common/types";

import { env } from "@/config";

// ── Config ────────────────────────────────────────────────────────────────────

const IS_PRODUCTION = env.MIDTRANS_IS_PRODUCTION;

const SNAP_BASE_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

const API_BASE_URL = IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

/** Base64-encoded "ServerKey:" for Basic Auth */
const AUTH_HEADER = `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SnapCustomerDetails {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
}

export interface SnapItemDetail {
  id: string;
  name: string;
  price: number;       // unit price in IDR
  quantity: number;
}

export interface SnapBillingAddress {
  firstName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface CreateSnapTransactionInput {
  /** Unique order ID sent to Midtrans — format: "ORD-{orderId}-{ts}" */
  orderId: string;
  /** Total amount in IDR */
  grossAmount: number;
  customerDetails: SnapCustomerDetails;
  itemDetails: SnapItemDetail[];
  billingAddress?: SnapBillingAddress;
  /** URL Midtrans will POST payment notifications to */
  notificationUrl?: string;
  /** URL to redirect after Snap payment completion (for redirect flow) */
  finishUrl?: string;
  /** Payment expiry — minutes from now (default: 60) */
  expiryMinutes?: number;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

// ── Create Snap transaction ───────────────────────────────────────────────────

/**
 * Create a Midtrans Snap transaction and get the payment token.
 * The token is passed to the frontend Snap.js popup.
 */
export async function createSnapTransaction(
  input: CreateSnapTransactionInput
): Promise<SnapTransactionResult> {
  const {
    orderId,
    grossAmount,
    customerDetails,
    itemDetails,
    billingAddress,
    notificationUrl,
    finishUrl,
    expiryMinutes = 60,
  } = input;

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: customerDetails.firstName,
      last_name: customerDetails.lastName,
      email: customerDetails.email,
      phone: customerDetails.phone,
    },
    item_details: itemDetails.map((item) => ({
      id: item.id,
      name: item.name.slice(0, 50), // Midtrans max 50 chars
      price: item.price,
      quantity: item.quantity,
    })),
    ...(billingAddress
      ? {
          billing_address: {
            first_name: billingAddress.firstName,
            phone: billingAddress.phone,
            address: billingAddress.address,
            city: billingAddress.city,
            postal_code: billingAddress.postalCode,
            country_code: billingAddress.countryCode,
          },
        }
      : {}),
    callbacks: {
      ...(notificationUrl ? { notification: notificationUrl } : {}),
      ...(finishUrl ? { finish: finishUrl } : {}),
    },
    expiry: {
      start_time: new Date()
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, " +0700"),
      unit: "minutes",
      duration: expiryMinutes,
    },
  };

  let res: Response;

  try {
    res = await fetch(`${SNAP_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_HEADER,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new PaymentGatewayError("Failed to reach Midtrans Snap API", err);
  }

  const json = await res.json() as { token?: string; redirect_url?: string; error_messages?: string[] };

  if (!res.ok || !json.token) {
    const messages = json.error_messages?.join("; ") ?? `HTTP ${res.status}`;
    throw new PaymentGatewayError(`Midtrans Snap error: ${messages}`);
  }

  return {
    token: json.token,
    redirectUrl: json.redirect_url ?? "",
  };
}

// ── Signature verification ────────────────────────────────────────────────────

/**
 * Verify the signature_key in a Midtrans HTTP notification.
 *
 * Midtrans signature = SHA512(orderId + statusCode + grossAmount + serverKey)
 *
 * @returns true if the signature is valid
 */
export function verifyMidtransSignature(
  notification: MidtransNotification
): boolean {
  const raw =
    notification.order_id +
    notification.status_code +
    notification.gross_amount +
    env.MIDTRANS_SERVER_KEY;

  const expected = createHash("sha512").update(raw).digest("hex");

  return expected === notification.signature_key;
}

// ── Check transaction status ──────────────────────────────────────────────────

/**
 * Query Midtrans for the current status of a transaction.
 * Useful for manual status verification.
 */
export async function checkTransactionStatus(
  midtransOrderId: string
): Promise<Record<string, unknown>> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/${midtransOrderId}/status`, {
      headers: { Authorization: AUTH_HEADER },
    });
  } catch (err) {
    throw new PaymentGatewayError("Failed to reach Midtrans API", err);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

// ── Refund ────────────────────────────────────────────────────────────────────

export interface RefundRequest {
  midtransOrderId: string;
  refundKey: string;    // unique key per refund attempt
  amount: number;       // IDR
  reason: string;
}

export async function createRefund(
  input: RefundRequest
): Promise<Record<string, unknown>> {
  let res: Response;

  try {
    res = await fetch(
      `${API_BASE_URL}/${input.midtransOrderId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH_HEADER,
        },
        body: JSON.stringify({
          refund_key: input.refundKey,
          amount: input.amount,
          reason: input.reason,
        }),
      }
    );
  } catch (err) {
    throw new PaymentGatewayError("Failed to reach Midtrans refund API", err);
  }

  const json = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new PaymentGatewayError(
      `Midtrans refund error: ${(json["error_messages"] as string[] | undefined)?.join("; ") ?? res.statusText}`
    );
  }

  return json;
}

// ── Payment method parser ─────────────────────────────────────────────────────

/**
 * Map Midtrans payment_type + bank/acquirer → our PaymentMethod enum value.
 */
export function parsePaymentMethod(
  notification: MidtransNotification
): string {
  const { payment_type, acquirer, bank } = notification;

  const vaBank = notification.va_numbers?.[0]?.bank?.toLowerCase();

  switch (payment_type) {
    case "bank_transfer": {
      const b = (vaBank ?? bank ?? "").toLowerCase();
      if (b === "bca") return "bank_transfer_bca";
      if (b === "bni") return "bank_transfer_bni";
      if (b === "bri") return "bank_transfer_bri";
      if (b === "mandiri") return "bank_transfer_mandiri";
      if (b === "permata") return "bank_transfer_permata";
      return "bank_transfer_bca";
    }
    case "echannel":
      return "bank_transfer_mandiri"; // Mandiri Bill Payment
    case "gopay":
      return "gopay";
    case "shopeepay":
      return "shopeepay";
    case "dana":
      return "dana";
    case "ovo":
      return "ovo";
    case "qris":
      return "qris";
    case "credit_card":
      return "credit_card";
    case "cstore": {
      const store = (notification.store ?? "").toLowerCase();
      if (store === "indomaret") return "cstore_indomaret";
      if (store.includes("alfa")) return "cstore_alfamart";
      return "cstore_indomaret";
    }
    case "akulaku":
      return "akulaku";
    case "kredivo":
      return "kredivo";
    default:
      return payment_type;
  }
}

