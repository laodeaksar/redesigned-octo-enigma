// =============================================================================
// Vouchers repository — PostgreSQL via Drizzle
// =============================================================================

import { eq, and, lte, gte, isNull, or, sql } from "drizzle-orm";

import {
  vouchersTable,
  type VoucherRow,
  type NewVoucherRow,
} from "@repo/database/drizzle/schema";

import type { DB } from "@/config";

export async function findVoucherByCode(
  db: DB,
  code: string
): Promise<VoucherRow | undefined> {
  const [row] = await db
    .select()
    .from(vouchersTable)
    .where(eq(vouchersTable.code, code.toUpperCase()))
    .limit(1);
  return row;
}

export async function findVoucherById(
  db: DB,
  id: string
): Promise<VoucherRow | undefined> {
  const [row] = await db
    .select()
    .from(vouchersTable)
    .where(eq(vouchersTable.id, id))
    .limit(1);
  return row;
}

export async function createVoucher(
  db: DB,
  data: NewVoucherRow
): Promise<VoucherRow> {
  const [row] = await db.insert(vouchersTable).values(data).returning();
  return row!;
}

export async function updateVoucher(
  db: DB,
  id: string,
  data: Partial<NewVoucherRow>
): Promise<VoucherRow | undefined> {
  const [row] = await db
    .update(vouchersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vouchersTable.id, id))
    .returning();
  return row;
}

/** Atomically increment usageCount. Returns false if limit reached. */
export async function incrementUsage(
  db: DB,
  id: string
): Promise<boolean> {
  const result = await db
    .update(vouchersTable)
    .set({
      usageCount: sql`${vouchersTable.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(vouchersTable.id, id),
        or(
          isNull(vouchersTable.usageLimit),
          sql`${vouchersTable.usageCount} < ${vouchersTable.usageLimit}`
        )
      )
    )
    .returning({ id: vouchersTable.id });

  return result.length > 0;
}

export async function listVouchers(db: DB): Promise<VoucherRow[]> {
  return db
    .select()
    .from(vouchersTable)
    .orderBy(vouchersTable.createdAt);
}

