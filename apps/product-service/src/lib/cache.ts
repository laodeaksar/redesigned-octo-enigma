// =============================================================================
// Cache helpers — Redis-backed with graceful degradation
// If Redis is unavailable the helper silently falls back to no-cache.
// =============================================================================

import type Redis from "ioredis";
import { env } from "@/config";

const DEFAULT_TTL = env.CACHE_TTL_SECONDS;

// ── Key builders (centralised to avoid typos) ─────────────────────────────────

export const CacheKey = {
  product: (id: string) => `product:${id}`,
  productBySlug: (slug: string) => `product:slug:${slug}`,
  productList: (query: string) => `products:list:${query}`,
  category: (id: string) => `category:${id}`,
  categoryTree: () => `categories:tree`,
  categoryList: () => `categories:list`,
  reviewList: (productId: string, page: number) =>
    `reviews:${productId}:page:${page}`,
  ratingSummary: (productId: string) => `rating:${productId}`,
} as const;

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Get a cached value. Returns null on miss or Redis unavailability.
 */
export async function cacheGet<T>(
  redis: Redis | null,
  key: string
): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set a value in cache. Silent no-op if Redis is unavailable.
 */
export async function cacheSet(
  redis: Redis | null,
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // cache write failure is non-fatal
  }
}

/**
 * Delete one or more exact keys.
 */
export async function cacheDel(
  redis: Redis | null,
  ...keys: string[]
): Promise<void> {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // non-fatal
  }
}

/**
 * Delete all keys matching a glob pattern (uses SCAN to avoid blocking).
 * Example: invalidatePattern(redis, "products:list:*")
 */
export async function invalidatePattern(
  redis: Redis | null,
  pattern: string
): Promise<void> {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // non-fatal
  }
}

/**
 * Cache-aside pattern: return cached value or execute fn and cache result.
 */
export async function cacheWrap<T>(
  redis: Redis | null,
  key: string,
  fn: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL
): Promise<T> {
  const cached = await cacheGet<T>(redis, key);
  if (cached !== null) return cached;

  const fresh = await fn();
  await cacheSet(redis, key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalidate all cache keys related to a product.
 * Call after any create/update/delete on product or its variants/images.
 */
export async function invalidateProduct(
  redis: Redis | null,
  productId: string,
  slug?: string
): Promise<void> {
  await Promise.all([
    cacheDel(redis, CacheKey.product(productId)),
    slug ? cacheDel(redis, CacheKey.productBySlug(slug)) : Promise.resolve(),
    invalidatePattern(redis, "products:list:*"),
  ]);
}

/**
 * Invalidate all category-related cache keys.
 */
export async function invalidateCategories(
  redis: Redis | null
): Promise<void> {
  await Promise.all([
    cacheDel(redis, CacheKey.categoryTree()),
    cacheDel(redis, CacheKey.categoryList()),
    invalidatePattern(redis, "category:*"),
  ]);
}

