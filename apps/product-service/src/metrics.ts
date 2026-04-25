// =============================================================================
// product-service Prometheus metrics
// =============================================================================

import Elysia from "elysia";
import {
  createRegistry,
  createHttpMetrics,
  createQueueMetrics,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Gauge,
  Histogram,
} from "@repo/common/metrics";

export const registry = createRegistry({ serviceName: "product-service" });
export const httpMetrics = createHttpMetrics(registry);
export const queueMetrics = createQueueMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const stockDeductions = new Counter({
  name:       "product_stock_deductions_total",
  help:       "Total successful stock deductions",
  registers:  [registry],
});

export const stockRestorations = new Counter({
  name:       "product_stock_restorations_total",
  help:       "Total stock restorations (from cancellations)",
  registers:  [registry],
});

export const outOfStockEvents = new Counter({
  name:       "product_out_of_stock_total",
  help:       "Total times a product variant went out of stock",
  registers:  [registry],
});

export const cacheHits = new Counter({
  name:       "product_cache_hits_total",
  help:       "Redis cache hits",
  labelNames: ["key_type"],  // product | category | review
  registers:  [registry],
});

export const cacheMisses = new Counter({
  name:       "product_cache_misses_total",
  help:       "Redis cache misses",
  labelNames: ["key_type"],
  registers:  [registry],
});

export const searchLatency = new Histogram({
  name:       "product_search_duration_seconds",
  help:       "Full-text product search query duration",
  buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
  registers:  [registry],
});

export const activeProducts = new Gauge({
  name:       "product_active_total",
  help:       "Current number of active products",
  registers:  [registry],
});

// ── /metrics route ────────────────────────────────────────────────────────────

export const metricsRoutes = new Elysia()
  .get("/metrics", async () => {
    const output = await getMetricsOutput(registry);
    return new Response(output, {
      headers: { "Content-Type": CONTENT_TYPE },
    });
  });

