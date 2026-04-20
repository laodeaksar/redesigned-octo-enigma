// =============================================================================
// Reviews controller
// =============================================================================

import { success, paginated } from "@repocommon/schemas";
import { safeParse } from "@repo/common/errors";
import { createReviewSchema } from "@repo/common/schemas";
import type Redis from "ioredis";

import * as service from "./reviews.service";
import type { DB } from "@/config";

export async function handleList(
  db: DB,
  redis: Redis | null,
  productId: string,
  query: { page?: string; limit?: string }
) {
  const page = Math.max(1, parseInt(query.page ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? "10", 10)));
  const { items, total } = await service.listReviews(db, redis, productId, page, limit);
  return paginated(items, { total, page, limit });
}

export async function handleGetRatingSummary(
  db: DB,
  redis: Redis | null,
  productId: string
) {
  return success(await service.getRatingSummary(db, redis, productId));
}

export async function handleCreate(
  db: DB,
  redis: Redis | null,
  userId: string,
  body: unknown
) {
  const input = safeParse(createReviewSchema, body);
  return success(await service.createReview(db, redis, userId, input), "Review submitted");
}

