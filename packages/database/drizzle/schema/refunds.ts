// =============================================================================
// refunds table
// Managed by: payment-service
// =============================================================================

import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { primaryId, timestamps } from "./_helpers";
import { paymentsTable } from "./payments";

export const refundStatusEnum = (name: string) =>
  varchar(name, { length: 20 })
    .notNull()
    .$type<"pending" | "success" | "failure">()
    .default("pending");

export const refundReasonEnum = (name: string) =>
  varchar(name, { length: 50 })
    .notNull()
    .$type<
      | "customer_request"
      | "defective_product"
      | "wrong_item"
      | "item_not_received"
      | "order_cancelled"
      | "admin_action"
    >();

export const refundsTable = pgTable(
  "refunds",
  {
    id: primaryId(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => paymentsTable.id, { onDelete: "restrict" }),
    /** MongoDB ObjectId from order-service */
    orderId: varchar("order_id", { length: 24 }).notNull(),
    /** Refund amount in IDR */
    amount: integer("amount").notNull(),
    reason: refundReasonEnum("reason"),
    note: text("note"),
    /** Midtrans refund ID, populated after successful refund */
    midtransRefundId: varchar("midtrans_refund_id", { length: 255 }),
    status: refundStatusEnum("status"),
    ...timestamps(),
  },
  (t) => ({
    paymentIdIdx: index("refunds_payment_id_idx").on(t.paymentId),
    orderIdIdx: index("refunds_order_id_idx").on(t.orderId),
    statusIdx: index("refunds_status_idx").on(t.status),
  }),
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const refundsRelations = relations(refundsTable, ({ one }) => ({
  payment: one(paymentsTable, {
    fields: [refundsTable.paymentId],
    references: [paymentsTable.id],
  }),
}));

// ── Types ─────────────────────────────────────────────────────────────────────

export type RefundRow = typeof refundsTable.$inferSelect;
export type NewRefundRow = typeof refundsTable.$inferInsert;
