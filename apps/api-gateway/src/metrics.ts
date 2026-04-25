// =============================================================================
// api-gateway Prometheus metrics
// =============================================================================

import { Hono } from "hono";
import {
  createRegistry,
  createHttpMetrics,
  honoMetricsMiddleware,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Histogram,
} from "@repo/common/metrics";

// ── Registry ──────────────────────────────────────────────────────────────────

export const registry = createRegistry({ serviceName: "api-gateway" });

// ── HTTP metrics (applied to all routes via app.use) ─────────────────────────

export const httpMetrics = createHttpMetrics(registry);
export const metricsMiddleware = honoMetricsMiddleware(httpMetrics);

// ── Gateway-specific metrics ──────────────────────────────────────────────────

export const proxyErrors = new Counter({
  name:       "gateway_proxy_errors_total",
  help:       "Total upstream proxy errors (5xx, timeouts)",
  labelNames: ["upstream", "error_type"],
  registers:  [registry],
});

export const authFailures = new Counter({
  name:       "gateway_auth_failures_total",
  help:       "Total authentication failures at gateway",
  labelNames: ["reason"],   // TOKEN_EXPIRED | TOKEN_INVALID | MISSING
  registers:  [registry],
});

export const rateLimitHits = new Counter({
  name:       "gateway_rate_limit_hits_total",
  help:       "Total requests rejected by rate limiter",
  labelNames: ["identifier_type"],  // ip | user_id
  registers:  [registry],
});

export const upstreamLatency = new Histogram({
  name:       "gateway_upstream_duration_seconds",
  help:       "Time spent waiting for upstream service response",
  labelNames: ["upstream"],
  buckets:    [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers:  [registry],
});

// ── /metrics endpoint ─────────────────────────────────────────────────────────

export const metricsRoutes = new Hono();

metricsRoutes.get("/metrics", async (c) => {
  const output = await getMetricsOutput(registry);
  return c.text(output, 200, { "Content-Type": CONTENT_TYPE });
});

