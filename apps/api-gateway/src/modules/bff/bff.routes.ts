// =============================================================================
// BFF (Backend-for-Frontend) aggregation routes — with Redis cache
//
// Aggregates multiple upstream calls into a single gateway response so the
// Astro SSR layer makes one HTTP connection instead of N, cutting TTFB.
//
// GET /bff/home      → Promise.all(featured products, top-level categories)
// GET /bff/pdp/:slug → Promise.all(product detail, related products)
//
// Caching strategy (cache-aside):
//   1. Check Redis for a cached payload
//   2. Cache HIT  → return immediately, set X-Cache: HIT
//   3. Cache MISS → fetch upstream, Zod-validate, write to Redis, return
//   4. Redis unavailable → always go upstream (graceful degrade, no error)
//
// TTLs:
//   bff:home        60 s — product list + categories change rarely
//   bff:pdp:{slug}  30 s — product detail, slightly more volatile
//
// Rules:
//   - All upstream fetches use SERVICES.product (internal, no public TLS)
//   - Every response is Zod-validated before writing to cache or returning
//   - Partial failures for non-critical data (related products) degrade
//     gracefully to an empty array — the main product 404 is always hard-fail
//   - X-Cache: HIT | MISS header on every response for observability
// =============================================================================

import { failure } from "@repo/common/schemas";
import { homeBFFResponseSchema, pdpBFFResponseSchema } from "@repo/common/types";
import type { HomeBFFResponse, PDPBFFResponse } from "@repo/common/types";
import { Hono } from "hono";

import { getRedis, SERVICES } from "@/config";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";

const app = new Hono();
const productBase = SERVICES.product;

// ── Cache TTLs ────────────────────────────────────────────────────────────────

const TTL = {
  home: 60,  // seconds
  pdp: 30,   // seconds
} as const;

const CACHE_KEY = {
  home: "bff:home",
  pdp: (slug: string) => `bff:pdp:${slug}`,
} as const;

// ── Internal fetch helper ─────────────────────────────────────────────────────

interface InternalResult<T> {
  data: T | null;
  ok: boolean;
  status: number;
}

async function internalFetch<T>(url: string): Promise<InternalResult<T>> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, data: null };
    }
    const json = (await res.json()) as { data: T };
    return { ok: true, status: res.status, data: json.data ?? null };
  } catch {
    return { ok: false, status: 503, data: null };
  }
}

// ── Redis cache helpers ───────────────────────────────────────────────────────

async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch {
    // Cache write failure is non-fatal — caller still returns the live data
  }
}

// ── GET /bff/home ─────────────────────────────────────────────────────────────

app.get("/bff/home", defaultRateLimit, async c => {
  // 1. Cache check
  const cached = await cacheGet<HomeBFFResponse>(CACHE_KEY.home);
  if (cached) {
    return c.json(
      { success: true, data: cached },
      200,
      {
        "X-Cache": "HIT",
        "Cache-Control": `public, max-age=${TTL.home}`,
      }
    );
  }

  // 2. Cache miss — fetch upstream in parallel
  const [productsResult, categoriesResult] = await Promise.all([
    internalFetch<unknown[]>(
      `${productBase}/products?page=1&limit=8&status=active&sortBy=createdAt&sortOrder=desc`
    ),
    internalFetch<unknown[]>(`${productBase}/categories`),
  ]);

  if (!productsResult.ok) {
    return c.json(
      failure("SERVICE_ERROR", "Product service unavailable"),
      502
    );
  }
  if (!categoriesResult.ok) {
    return c.json(
      failure("SERVICE_ERROR", "Category service unavailable"),
      502
    );
  }

  const rawCategories = Array.isArray(categoriesResult.data)
    ? categoriesResult.data
    : [];

  const topLevelCategories = (
    rawCategories as Array<{ parentId: string | null }>
  )
    .filter(cat => cat.parentId === null)
    .slice(0, 6);

  // 3. Validate before caching — never write bad data to Redis
  const parsed = homeBFFResponseSchema.safeParse({
    featuredProducts: productsResult.data ?? [],
    categories: topLevelCategories,
  });

  if (!parsed.success) {
    return c.json(
      failure("VALIDATION_ERROR", "Upstream response shape mismatch"),
      502
    );
  }

  // 4. Populate cache (fire-and-forget — don't block the response)
  void cacheSet(CACHE_KEY.home, parsed.data, TTL.home);

  return c.json(
    { success: true, data: parsed.data },
    200,
    {
      "X-Cache": "MISS",
      "Cache-Control": `public, max-age=${TTL.home}`,
    }
  );
});

// ── GET /bff/pdp/:slug ────────────────────────────────────────────────────────

app.get("/bff/pdp/:slug", defaultRateLimit, async c => {
  const slug = c.req.param("slug");
  const cacheKey = CACHE_KEY.pdp(slug);

  // 1. Cache check
  const cached = await cacheGet<PDPBFFResponse>(cacheKey);
  if (cached) {
    return c.json(
      { success: true, data: cached },
      200,
      {
        "X-Cache": "HIT",
        "Cache-Control": `public, max-age=${TTL.pdp}`,
      }
    );
  }

  // 2. Cache miss — fetch product detail and related products in parallel.
  // Related products endpoint may not exist on older product-service builds —
  // a non-200 response degrades gracefully to an empty relatedProducts array.
  const [productResult, relatedResult] = await Promise.all([
    internalFetch<unknown>(`${productBase}/products/slug/${slug}`),
    internalFetch<unknown[]>(
      `${productBase}/products/slug/${slug}/related`
    ).catch(() => ({ ok: false as const, status: 404, data: null })),
  ]);

  if (!productResult.ok) {
    const is404 = productResult.status === 404;
    return c.json(
      failure(
        is404 ? "NOT_FOUND" : "SERVICE_ERROR",
        is404 ? "Product not found" : "Product service unavailable"
      ),
      is404 ? 404 : 502
    );
  }

  const relatedProducts =
    relatedResult.ok && Array.isArray(relatedResult.data)
      ? relatedResult.data
      : [];

  // 3. Validate before caching
  const parsed = pdpBFFResponseSchema.safeParse({
    product: productResult.data,
    relatedProducts,
  });

  if (!parsed.success) {
    return c.json(
      failure("VALIDATION_ERROR", "Upstream response shape mismatch"),
      502
    );
  }

  // 4. Populate cache
  void cacheSet(cacheKey, parsed.data, TTL.pdp);

  return c.json(
    { success: true, data: parsed.data },
    200,
    {
      "X-Cache": "MISS",
      "Cache-Control": `public, max-age=${TTL.pdp}`,
    }
  );
});

export { app as bffRoutes };
