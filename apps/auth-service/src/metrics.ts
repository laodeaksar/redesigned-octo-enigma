// =============================================================================
// auth-service Prometheus metrics
// =============================================================================

import Elysia from "elysia";
import {
  createRegistry,
  createHttpMetrics,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Histogram,
} from "@repo/common/metrics";

export const registry = createRegistry({ serviceName: "auth-service" });
export const httpMetrics = createHttpMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const registrations = new Counter({
  name:       "auth_registrations_total",
  help:       "Total user registrations",
  labelNames: ["method"],  // email | google | github
  registers:  [registry],
});

export const logins = new Counter({
  name:       "auth_logins_total",
  help:       "Total login attempts",
  labelNames: ["method", "success"],
  registers:  [registry],
});

export const passwordResets = new Counter({
  name:       "auth_password_resets_total",
  help:       "Total password reset requests",
  registers:  [registry],
});

export const tokenRefreshes = new Counter({
  name:       "auth_token_refreshes_total",
  help:       "Total JWT token refresh operations",
  labelNames: ["success"],
  registers:  [registry],
});

export const passwordHashDuration = new Histogram({
  name:       "auth_password_hash_duration_seconds",
  help:       "Time to hash a password (argon2)",
  buckets:    [0.05, 0.1, 0.2, 0.5, 1, 2],
  registers:  [registry],
});

// ── /metrics Elysia route ─────────────────────────────────────────────────────

export const metricsRoutes = new Elysia()
  .get("/metrics", async () => {
    const output = await getMetricsOutput(registry);
    return new Response(output, {
      headers: { "Content-Type": CONTENT_TYPE },
    });
  });

