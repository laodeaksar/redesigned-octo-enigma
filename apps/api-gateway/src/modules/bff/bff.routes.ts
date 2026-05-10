// =============================================================================
// BFF (Backend-for-Frontend) aggregation routes
//
// Aggregates multiple upstream calls into a single gateway response so the
// Astro SSR layer makes one HTTP connection instead of N, cutting TTFB.
//
// GET /bff/home      → Promise.all(featured products, top-level categories)
// GET /bff/pdp/:slug → Promise.all(product detail, related products)
//
// Rules:
//   - All upstream fetches use SERVICES.product (internal, no public TLS)
//   - Every response is Zod-validated before returning to the client
//   - Partial failures for non-critical data (related products) degrade
//     gracefully to an empty array — the main product 404 is always hard-fail
// =============================================================================

import { failure } from "@repo/common/schemas";
import { homeBFFResponseSchema, pdpBFFResponseSchema } from "@repo/common/types";
import { Hono } from "hono";

import { SERVICES } from "@/config";
import { defaultRateLimit } from "@/middleware/rate-limit.middleware";

const app = new Hono();
const productBase = SERVICES.product;

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

// ── GET /bff/home ─────────────────────────────────────────────────────────────

app.get("/bff/home", defaultRateLimit, async c => {
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

  return c.json({ success: true, data: parsed.data });
});

// ── GET /bff/pdp/:slug ────────────────────────────────────────────────────────

app.get("/bff/pdp/:slug", defaultRateLimit, async c => {
  const slug = c.req.param("slug");

  // Fetch product detail and related products in parallel.
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

  return c.json({ success: true, data: parsed.data });
});

export { app as bffRoutes };
