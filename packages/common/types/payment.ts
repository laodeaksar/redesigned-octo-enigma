// =============================================================================
// Payment Types
// Used by: payment-service, order-service, apps/web, apps/admin
// Provider: Midtrans
// =============================================================================

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending"
  | "challenge" // Midtrans: needs manual review (fraud detection)
  | "capture" // Midtrans: authorized but not yet settled (credit card)
  | "settlement" // Fully paid & settled
  | "deny" // Denied by bank/Midtrans
  | "cancel" // Cancelled by customer or system
  | "expire" // Payment page expired
  | "failure"
  | "refund"
  | "partial_refund";

export type PaymentMethod =
  | "bank_transfer_bca"
  | "bank_transfer_bni"
  | "bank_transfer_bri"
  | "bank_transfer_mandiri"
  | "bank_transfer_permata"
  | "gopay"
  | "shopeepay"
  | "dana"
  | "ovo"
  | "qris"
  | "credit_card"
  | "cstore_indomaret"
  | "cstore_alfamart"
  | "akulaku"
  | "kredivo";

// ── Virtual Account ───────────────────────────────────────────────────────────

export interface VirtualAccountInfo {
  bank: string;
  expiresAt: Date;
  vaNumber: string;
}

// ── E-Wallet ──────────────────────────────────────────────────────────────────

export interface EWalletInfo {
  deepLinkUrl: string | null;
  expiresAt: Date;
  provider: string;
  qrCodeUrl: string | null;
}

// ── Convenience Store ─────────────────────────────────────────────────────────

export interface CStoreInfo {
  expiresAt: Date;
  paymentCode: string;
  store: "indomaret" | "alfamart";
}

// ── Core Entity ───────────────────────────────────────────────────────────────

export interface Payment {
  amount: number; // in IDR
  createdAt: Date;
  cStore: CStoreInfo | null;
  currency: "IDR";
  eWallet: EWalletInfo | null;
  expiresAt: Date;
  id: string;
  method: PaymentMethod | null; // null until customer selects method
  /** Midtrans order ID sent to their API */
  midtransOrderId: string;

  /** Raw Midtrans notification payload — stored for audit */
  midtransRawNotification: Record<string, unknown> | null;
  orderId: string;

  paidAt: Date | null;
  /** Redirect URL for hosted payment page (alternative to Snap) */
  snapRedirectUrl: string | null;
  /** Snap payment token — passed to frontend Snap.js popup */
  snapToken: string | null;
  status: PaymentStatus;

  /** Midtrans transaction ID */
  transactionId: string | null;
  updatedAt: Date;
  userId: string;

  /** Payment method-specific instructions */
  virtualAccount: VirtualAccountInfo | null;
}

/** Lightweight version safe to send to the client */
export type PaymentSummary = Pick<
  Payment,
  | "id"
  | "orderId"
  | "status"
  | "method"
  | "amount"
  | "currency"
  | "snapToken"
  | "snapRedirectUrl"
  | "virtualAccount"
  | "eWallet"
  | "cStore"
  | "paidAt"
  | "expiresAt"
>;

// ── Midtrans Webhook ──────────────────────────────────────────────────────────

/** Shape of Midtrans HTTP notification payload */
export interface MidtransNotification {
  // E-wallet fields
  acquirer?: string;
  currency: string;
  fraud_status?: string;
  gross_amount: string;
  merchant_id: string;
  order_id: string;
  payment_type: string;
  signature_key: string;
  status_code: string;
  status_message: string;
  transaction_id: string;
  transaction_status: string;
  transaction_time: string;
  // Bank transfer fields
  va_numbers?: Array<{ bank: string; va_number: string }>;
}

// ── Refund ────────────────────────────────────────────────────────────────────

export type RefundReason =
  | "customer_request"
  | "defective_product"
  | "wrong_item"
  | "item_not_received"
  | "order_cancelled"
  | "admin_action";

export interface Refund {
  amount: number;
  createdAt: Date;
  id: string;
  midtransRefundId: string | null;
  note: string | null;
  orderId: string;
  paymentId: string;
  reason: RefundReason;
  status: "pending" | "success" | "failure";
  updatedAt: Date;
}
