// =============================================================================
// HTTP metrics — request duration, status codes, in-flight requests
// Works with both Elysia (backend services) and Hono (api-gateway)
// =============================================================================

import { Histogram, Counter, Gauge, type Registry } from "prom-client";

// ── Metric definitions ────────────────────────────────────────────────────────

export interface HttpMetrics {
  requestDuration: Histogram;
  requestTotal:    Counter;
  requestsInFlight: Gauge;
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export function createHttpMetrics(registry: Registry): HttpMetrics {
  const requestDuration = new Histogram({
    name:    "http_request_duration_seconds",
    help:    "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: DEFAULT_BUCKETS,
    registers: [registry],
  });

  const requestTotal = new Counter({
    name:    "http_requests_total",
    help:    "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [registry],
  });

  const requestsInFlight = new Gauge({
    name:    "http_requests_in_flight",
    help:    "Number of HTTP requests currently being processed",
    labelNames: ["method"],
    registers: [registry],
  });

  return { requestDuration, requestTotal, requestsInFlight };
}

// ── Elysia middleware ─────────────────────────────────────────────────────────

/**
 * Elysia plugin that records HTTP metrics for every request.
 *
 * Usage:
 *   import Elysia from "elysia"
 *   import { elysiaMetricsMiddleware } from "@my-ecommerce/common/metrics"
 *
 *   const app = new Elysia()
 *     .use(elysiaMetricsMiddleware(httpMetrics))
 */
export function elysiaMetricsMiddleware(metrics: HttpMetrics) {
  // Elysia is imported lazily so this file doesn't hard-depend on it
  // in packages that don't use Elysia (api-gateway uses Hono)
  const { requestDuration, requestTotal, requestsInFlight } = metrics;

  return {
    name: "prometheus-metrics",
    // Called for every request — returns an Elysia-compatible object
    setup(app: {
      onRequest: (fn: (ctx: { request: Request }) => void) => void;
      onAfterHandle: (fn: (ctx: { request: Request; set: { status?: number | string } }) => void) => void;
    }) {
      const timers = new WeakMap<Request, () => number>();

      app.onRequest(({ request }) => {
        requestsInFlight.inc({ method: request.method });
        const start = performance.now();
        timers.set(request, () => (performance.now() - start) / 1000);
      });

      app.onAfterHandle(({ request, set }) => {
        const elapsed = timers.get(request)?.() ?? 0;
        timers.delete(request);
        requestsInFlight.dec({ method: request.method });

        const url    = new URL(request.url);
        const route  = normalizeRoute(url.pathname);
        const status = String(set.status ?? 200);

        requestDuration.observe({ method: request.method, route, status_code: status }, elapsed);
        requestTotal.inc({ method: request.method, route, status_code: status });
      });
    },
  };
}

// ── Hono middleware ───────────────────────────────────────────────────────────

import type { MiddlewareHandler } from "hono";

/**
 * Hono middleware that records HTTP metrics.
 *
 * Usage:
 *   import { honoMetricsMiddleware } from "@my-ecommerce/common/metrics"
 *   app.use("*", honoMetricsMiddleware(httpMetrics))
 */
export function honoMetricsMiddleware(metrics: HttpMetrics): MiddlewareHandler {
  const { requestDuration, requestTotal, requestsInFlight } = metrics;

  return async (c, next) => {
    const start  = performance.now();
    const method = c.req.method;

    requestsInFlight.inc({ method });

    await next();

    const elapsed    = (performance.now() - start) / 1000;
    const route      = normalizeRoute(c.req.path);
    const statusCode = String(c.res.status);

    requestsInFlight.dec({ method });
    requestDuration.observe({ method, route, status_code: statusCode }, elapsed);
    requestTotal.inc({ method, route, status_code: statusCode });
  };
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Replace dynamic path segments with placeholders to avoid cardinality explosion.
 * e.g. /products/abc-123-xyz  →  /products/:id
 *      /orders/507f1f77bcf86cd799439011  →  /orders/:id
 */
function normalizeRoute(path: string): string {
  return path
    // MongoDB ObjectId (24 hex chars)
    .replace(/\/[a-f0-9]{24}(\/|$)/g, "/:id$1")
    // UUID
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/gi, "/:id$1")
    // Numeric IDs
    .replace(/\/\d+(\/|$)/g, "/:id$1")
    // Long slugs (heuristic: 30+ chars)
    .replace(/\/[a-z0-9-]{30,}(\/|$)/g, "/:slug$1");
}

