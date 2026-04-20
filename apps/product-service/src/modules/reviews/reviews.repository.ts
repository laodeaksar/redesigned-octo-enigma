// =============================================================================
// Reviews repository
// =============================================================================

import { eq, desc, count, avg, sql } from "drizzle-orm";

import {
  productReviewsTable,
  type ProductReviewRow,
  type NewProductReviewRow,
} from "@repo/database/drizzle/schema";

import type { DB } from "@/config";

export async function findReviewsByProduct(
  db: DB,
  productId: string,
  page: number,
  limit: number
): Promise<{ items: ProductReviewRow[]; total: number }> {
  const offset = (page - 1) * limit;

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(productReviewsTable)
      .where(eq(productReviewsTable.productId, productId))
      .orderBy(desc(productReviewsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(productReviewsTable)
      .where(eq(productReviewsTable.productId, productId)),
  ]);

  return { items, total: Number(total) };
}

export async function findReviewByUserAndOrder(
  db: DB,
  productId: string,
  userId: string,
  orderId: string
): Promise<ProductReviewRow | undefined> {
  const [row] = await db
    .select()
    .from(productReviewsTable)
    .where(
      sql`${productReviewsTable.productId} = ${productId}
      AND ${productReviewsTable.userId} = ${userId}
      AND ${productReviewsTable.orderId} = ${orderId}`
    )
    .limit(1);
  return row;
}

export async function createReview(
  db: DB,
  data: NewProductReviewRow
): Promise<ProductReviewRow> {
  const [row] = await db.insert(productReviewsTable).values(data).returning();
  return row!;
}

export async function getRatingSummary(
  db: DB,
  productId: string
): Promise<{ average: number; count: number; breakdown: Record<number, number> }> {
  const rows = await db
    .select({
      rating: productReviewsTable.rating,
      cnt: count(),
    })
    .from(productReviewsTable)
    .where(eq(productReviewsTable.productId, productId))
    .groupBy(productReviewsTable.rating);

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalCount = 0;
  let totalScore = 0;

  for (const row of rows) {
    const r = row.rating as number;
    const c = Number(row.cnt);
    breakdown[r] = c;
    totalCount += c;
    totalScore += r * c;
  }

  return {
    average: totalCount > 0 ? Math.round((totalScore / totalCount) * 10) / 10 : 0,
    count: totalCount,
    breakdown: breakdown as Record<1 | 2 | 3 | 4 | 5, number>,
  };
}

