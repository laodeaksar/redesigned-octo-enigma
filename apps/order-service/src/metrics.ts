// =============================================================================
// order-service Prometheus metrics
// =============================================================================

import Elysia from "elysia";
import {
  createRegistry,
  createHttpMetrics,
  createQueueMetrics,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Histogram,
  Gauge,
} from "@repo/common/metrics";

export const registry = createRegistry({ serviceName: "order-service" });
export const httpMetrics = createHttpMetrics(registry);
export const queueMetrics = createQueueMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const ordersCreated = new Counter({
  name:       "order_created_total",
  help:       "Total orders created",
  registers:  [registry],
});

export const ordersCancelled = new Counter({
  name:       "order_cancelled_total",
  help:       "Total orders cancelled",
  labelNames: ["reason"],  // customer_request | payment_expired | out_of_stock | admin_action
  registers:  [registry],
});

export const ordersExpired = new Counter({
  name:       "order_expired_total",
  help:       "Total orders auto-cancelled due to payment expiry",
  registers:  [registry],
});

export const orderValue = new Histogram({
  name:       "order_value_idr",
  help:       "Distribution of order grand total values in IDR",
  buckets:    [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000],
  registers:  [registry],
});

export const shippingCost = new Histogram({
  name:       "order_shipping_cost_idr",
  help:       "Distribution of shipping cost in IDR",
  buckets:    [5_000, 10_000, 15_000, 20_000, 30_000, 50_000],
  registers:  [registry],
});

export const ordersByStatus = new Gauge({
  name:       "order_by_status",
  help:       "Current number of orders per status",
  labelNames: ["status"],
  registers:  [registry],
});

export const voucherApplications = new Counter({
  name:       "order_voucher_applied_total",
  help:       "Total orders with a voucher applied",
  labelNames: ["voucher_type"],
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

