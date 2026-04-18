// =============================================================================
// payments table
// Managed by: payment-service
// Stores Midtrans transaction records
// =============================================================================

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import {
  primaryId,
  paymentMethodEnum,
  paymentStatusEnum,
  timestamps,
} from "./_helpers";
import { refundsTable } from "./refunds";

export const paymentsTable = pgTable(
  "payments",
  {
    id: primaryId(),
    /** MongoDB ObjectId from order-service */
    orderId: varchar("order_id", { length: 24 }).notNull(),
    userId: uuid("user_id").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    method: paymentMethodEnum("method"),
    /** Amount in IDR (integer) */
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("IDR"),

    // ── Midtrans fields ──────────────────────────────────────────────────────
    /** Midtrans transaction ID returned after payment */
    transactionId: varchar("transaction_id", { length: 255 }).unique(),
    /** Order ID sent to Midtrans — format: "ORD-{orderId}-{timestamp}" */
    midtransOrderId: varchar("midtrans_order_id", { length: 255 })
      .notNull()
      .unique(),
    /** Snap payment token for Snap.js popup */
    snapToken: text("snap_token"),
    /** Redirect URL for non-Snap hosted payment */
    snapRedirectUrl: text("snap_redirect_url"),

    // ── Payment method details (populated after method selection) ────────────
    /** Virtual account bank + number — JSON */
    virtualAccount: jsonb("virtual_account")
      .$type<{ bank: string; vaNumber: string; expiresAt: string } | null>()
      .default(null),
    /** E-wallet info — JSON */
    eWallet: jsonb("e_wallet")
      .$type<{
        provider: string;
        qrCodeUrl: string | null;
        deepLinkUrl: string | null;
        expiresAt: string;
      } | null>()
      .default(null),
    /** Convenience store payment info — JSON */
    cStore: jsonb("c_store")
      .$type<{
        store: "indomaret" | "alfamart";
        paymentCode: string;
        expiresAt: string;
      } | null>()
      .default(null),

    /** Raw Midtrans notification payload — stored for audit/debugging */
    midtransRawNotification: jsonb("midtrans_raw_notification")
      .$type<Record<string, unknown> | null>()
      .default(null),

    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => ({
    paymentsOrderIdIdx: index("payments_order_id_idx").on(t.orderId),
    paymentsUserIdIdx: index("payments_user_id_idx").on(t.userId),
    paymentsStatusIdx: index("payments_status_idx").on(t.status),
    paymentsTransactionIdIdx: index("payments_transaction_id_idx").on(
      t.transactionId,
    ),
    paymentsMidtransOrderIdIdx: index("payments_midtrans_order_id_idx").on(
      t.midtransOrderId,
    ),
    paymentsExpiresAtIdx: index("payments_expires_at_idx").on(t.expiresAt),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const paymentsRelations = relations(paymentsTable, ({ many }) => ({
  refunds: many(refundsTable),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentRow = typeof paymentsTable.$inferSelect;
export type NewPaymentRow = typeof paymentsTable.$inferInsert;
