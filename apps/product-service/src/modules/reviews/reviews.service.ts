// =============================================================================
// Reviews service
// =============================================================================

import type Redis from "ioredis";
import { eq } from "drizzle-orm";

import { ConflictError, NotFoundError, ForbiddenError } from "@repo/common/errors";
import type { CreateReviewInput } from "@repo/common/schemas";
import { productReviewsTable } from "@repo/database/drizzle/schema";

import * as repo from "./reviews.repository";
import { CacheKey, cacheWrap, cacheDel } from "@/lib/cache";
import { verifyPurchase } from "@/lib/order-client";
import type { DB } from "@/config";

export async function listReviews(
  db: DB,
  redis: Redis | null,
  productId: string,
  page: number,
  limit: number
) {
  return cacheWrap(
    redis,
    CacheKey.reviewList(productId, page),
    () => repo.findReviewsByProduct(db, productId, page, limit),
    120
  );
}

export async function getRatingSummary(
  db: DB,
  redis: Redis | null,
  productId: string
) {
  return cacheWrap(
    redis,
    CacheKey.ratingSummary(productId),
    () => repo.getRatingSummary(db, productId),
    300
  );
}

export async function createReview(
  db: DB,
  redis: Redis | null,
  userId: string,
  input: CreateReviewInput
) {
  // 1. Verify the user actually purchased this product via order-service
  const isPurchased = await verifyPurchase(userId, input.productId, input.orderId);
  if (!isPurchased) {
    throw new ForbiddenError(
      "Kamu hanya bisa memberi ulasan untuk produk yang sudah kamu beli dan terima."
    );
  }

  // 2. One review per user per order per product
  const existing = await repo.findReviewByUserAndOrder(
    db,
    input.productId,
    userId,
    input.orderId
  );

  if (existing) {
    throw new ConflictError(
      "You have already reviewed this product for this order",
      "CONFLICT"
    );
  }

  const review = await repo.createReview(db, {
    ...input,
    userId,
    isVerifiedPurchase: true,
  });

  // 3. Invalidate rating cache
  await cacheDel(
    redis,
    CacheKey.ratingSummary(input.productId),
    CacheKey.reviewList(input.productId, 1)
  );

  return review;
}

export async function deleteReview(
  db: DB,
  redis: Redis | null,
  reviewId: string,
  requesterId: string,
  requesterRole: string
) {
  const isAdmin = requesterRole === "admin" || requesterRole === "super_admin";

  const [existing] = await db
    .select()
    .from(productReviewsTable)
    .where(eq(productReviewsTable.id, reviewId))
    .limit(1);

  if (!existing) throw new NotFoundError("Review");

  if (!isAdmin && existing.userId !== requesterId) {
    throw new ForbiddenError("You can only delete your own reviews");
  }

  const deleted = await repo.deleteReview(db, reviewId);

  // Invalidate rating caches
  if (deleted) {
    await cacheDel(
      redis,
      CacheKey.ratingSummary(deleted.productId),
      CacheKey.reviewList(deleted.productId, 1)
    );
  }

  return deleted;
}
