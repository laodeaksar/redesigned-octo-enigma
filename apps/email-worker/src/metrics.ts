// =============================================================================
// email-worker Prometheus metrics
//
// email-worker has no HTTP server, so it uses prom-client's push gateway
// OR exposes a minimal HTTP server just for /metrics.
// We use the lightweight approach: a tiny Bun.serve on a separate port.
// =============================================================================

import {
  createRegistry,
  createQueueMetrics,
  getMetricsOutput,
  CONTENT_TYPE,
  Counter,
  Histogram,
} from "@repo/common/metrics";

export const registry = createRegistry({ serviceName: "email-worker" });
export const queueMetrics = createQueueMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const emailsSent = new Counter({
  name:       "email_sent_total",
  help:       "Total emails sent successfully",
  labelNames: ["type", "provider"],  // type: welcome|order-confirmation|etc, provider: smtp|resend
  registers:  [registry],
});

export const emailsFailed = new Counter({
  name:       "email_failed_total",
  help:       "Total email send failures",
  labelNames: ["type"],
  registers:  [registry],
});

export const emailSendDuration = new Histogram({
  name:       "email_send_duration_seconds",
  help:       "Time to send an email via SMTP or Resend",
  labelNames: ["type", "provider"],
  buckets:    [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers:  [registry],
});

// ── Minimal HTTP server for /metrics scraping ─────────────────────────────────

const METRICS_PORT = parseInt(process.env["METRICS_PORT"] ?? "9091", 10);

export function startMetricsServer(): void {
  Bun.serve({
    port:     METRICS_PORT,
    hostname: "0.0.0.0",
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/metrics") {
        const output = await getMetricsOutput(registry);
        return new Response(output, {
          headers: { "Content-Type": CONTENT_TYPE },
        });
      }

      if (url.pathname === "/health") {
        return new Response("ok", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.info(`✓ Metrics server listening on :${METRICS_PORT}/metrics`);
}

