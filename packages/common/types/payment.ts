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
  vaNumber: string;
  expiresAt: Date;
}

// ── E-Wallet ──────────────────────────────────────────────────────────────────

export interface EWalletInfo {
  provider: string;
  qrCodeUrl: string | null;
  deepLinkUrl: string | null;
  expiresAt: Date;
}

// ── Convenience Store ─────────────────────────────────────────────────────────

export interface CStoreInfo {
  store: "indomaret" | "alfamart";
  paymentCode: string;
  expiresAt: Date;
}

// ── Core Entity ───────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  status: PaymentStatus;
  method: PaymentMethod | null; // null until customer selects method
  amount: number; // in IDR
  currency: "IDR";

  /** Midtrans transaction ID */
  transactionId: string | null;
  /** Midtrans order ID sent to their API */
  midtransOrderId: string;
  /** Snap payment token — passed to frontend Snap.js popup */
  snapToken: string | null;
  /** Redirect URL for hosted payment page (alternative to Snap) */
  snapRedirectUrl: string | null;

  /** Payment method-specific instructions */
  virtualAccount: VirtualAccountInfo | null;
  eWallet: EWalletInfo | null;
  cStore: CStoreInfo | null;

  /** Raw Midtrans notification payload — stored for audit */
  midtransRawNotification: Record<string, unknown> | null;

  paidAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
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
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  // Bank transfer fields
  va_numbers?: Array<{ bank: string; va_number: string }>;
  // E-wallet fields
  acquirer?: string;
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
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  reason: RefundReason;
  note: string | null;
  midtransRefundId: string | null;
  status: "pending" | "success" | "failure";
  createdAt: Date;
  updatedAt: Date;
}
