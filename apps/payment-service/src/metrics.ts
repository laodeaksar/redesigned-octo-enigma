// =============================================================================
// payment-service Prometheus metrics
// =============================================================================

import Elysia from "elysia";
import {
  createRegistry,
  createHttpMetrics,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Histogram,
  Gauge,
} from "@repo/common/metrics";

export const registry = createRegistry({ serviceName: "payment-service" });
export const httpMetrics = createHttpMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const paymentsInitiated = new Counter({
  name:       "payment_initiated_total",
  help:       "Total payment transactions initiated via Midtrans Snap",
  registers:  [registry],
});

export const paymentsSettled = new Counter({
  name:       "payment_settled_total",
  help:       "Total payments successfully settled",
  labelNames: ["method"],  // bank_transfer_bca | gopay | qris | credit_card | etc.
  registers:  [registry],
});

export const paymentsFailed = new Counter({
  name:       "payment_failed_total",
  help:       "Total payments denied, cancelled, or expired",
  labelNames: ["status"],  // deny | cancel | expire | failure
  registers:  [registry],
});

export const paymentsRefunded = new Counter({
  name:       "payment_refunded_total",
  help:       "Total payments refunded (full or partial)",
  labelNames: ["type"],    // full | partial
  registers:  [registry],
});

export const paymentAmount = new Histogram({
  name:       "payment_amount_idr",
  help:       "Distribution of settled payment amounts in IDR",
  buckets:    [10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000],
  registers:  [registry],
});

export const webhooksReceived = new Counter({
  name:       "payment_webhook_received_total",
  help:       "Total Midtrans webhook notifications received",
  labelNames: ["transaction_status", "valid_signature"],
  registers:  [registry],
});

export const webhookProcessingTime = new Histogram({
  name:       "payment_webhook_duration_seconds",
  help:       "Time to process a Midtrans webhook end-to-end (including order-service call)",
  buckets:    [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers:  [registry],
});

export const midtransApiLatency = new Histogram({
  name:       "payment_midtrans_api_duration_seconds",
  help:       "Midtrans API call latency (Snap create, status check, refund)",
  labelNames: ["operation"],
  buckets:    [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers:  [registry],
});

export const pendingPayments = new Gauge({
  name:       "payment_pending_total",
  help:       "Current number of pending payments awaiting completion",
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

