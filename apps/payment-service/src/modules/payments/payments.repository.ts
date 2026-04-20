// =============================================================================
// Payments repository — PostgreSQL via Drizzle
// =============================================================================

import { eq, and, desc, count, asc } from "drizzle-orm";

import {
  paymentsTable,
  refundsTable,
  type PaymentRow,
  type NewPaymentRow,
  type RefundRow,
  type NewRefundRow,
} from "@repo/database/drizzle/schema";
import type { ListPaymentsQuery } from "@my-ecommerce/common/schemas";

import type { DB } from "@/config";

// ── Payments ──────────────────────────────────────────────────────────────────

export async function findPaymentById(
  db: DB,
  id: string
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, id))
    .limit(1);
  return row;
}

export async function findPaymentByOrderId(
  db: DB,
  orderId: string
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.orderId, orderId))
    .limit(1);
  return row;
}

export async function findPaymentByMidtransOrderId(
  db: DB,
  midtransOrderId: string
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.midtransOrderId, midtransOrderId))
    .limit(1);
  return row;
}

export async function createPayment(
  db: DB,
  data: NewPaymentRow
): Promise<PaymentRow> {
  const [row] = await db.insert(paymentsTable).values(data).returning();
  return row!;
}

export async function updatePayment(
  db: DB,
  id: string,
  data: Partial<NewPaymentRow>
): Promise<PaymentRow | undefined> {
  const [row] = await db
    .update(paymentsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(paymentsTable.id, id))
    .returning();
  return row;
}

export async function listPayments(
  db: DB,
  query: ListPaymentsQuery
): Promise<{ items: PaymentRow[]; total: number }> {
  const conditions = [];

  if (query.status) conditions.push(eq(paymentsTable.status, query.status));
  if (query.method) conditions.push(eq(paymentsTable.method, query.method));
  if (query.userId) conditions.push(eq(paymentsTable.userId, query.userId));

  const sortField =
    query.sortBy === "amount" ? paymentsTable.amount :
    query.sortBy === "paidAt" ? paymentsTable.paidAt :
    query.sortBy === "updatedAt" ? paymentsTable.updatedAt :
    paymentsTable.createdAt;

  const orderFn = query.sortOrder === "asc" ? asc : desc;
  const offset = (query.page - 1) * query.limit;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(paymentsTable)
      .where(whereClause)
      .orderBy(orderFn(sortField))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(paymentsTable)
      .where(whereClause),
  ]);

  return { items, total: Number(total) };
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export async function findRefundsByPaymentId(
  db: DB,
  paymentId: string
): Promise<RefundRow[]> {
  return db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.paymentId, paymentId))
    .orderBy(desc(refundsTable.createdAt));
}

export async function createRefund(
  db: DB,
  data: NewRefundRow
): Promise<RefundRow> {
  const [row] = await db.insert(refundsTable).values(data).returning();
  return row!;
}

export async function updateRefund(
  db: DB,
  id: string,
  data: Partial<NewRefundRow>
): Promise<RefundRow | undefined> {
  const [row] = await db
    .update(refundsTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(refundsTable.id, id))
    .returning();
  return row;
}

