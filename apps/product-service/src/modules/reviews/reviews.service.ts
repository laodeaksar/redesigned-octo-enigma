// =============================================================================
// Reviews service
// =============================================================================

import type Redis from "ioredis";

import { ConflictError, NotFoundError } from "@repo/common/errors";
import type { CreateReviewInput } from "@repo/common/schemas";

import * as repo from "./reviews.repository";
import { CacheKey, cacheWrap, cacheDel } from "@/lib/cache";
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
  // One review per user per order per product
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

  // Invalidate rating cache
  await cacheDel(
    redis,
    CacheKey.ratingSummary(input.productId),
    CacheKey.reviewList(input.productId, 1)
  );

  return review;
}

