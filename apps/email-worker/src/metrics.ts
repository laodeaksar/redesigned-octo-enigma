// =============================================================================
// email-worker Prometheus metrics
//
// Exposes a minimal HTTP server on METRICS_PORT for /metrics scraping.
// =============================================================================

import {
  CONTENT_TYPE,
  Counter,
  createQueueMetrics,
  createRegistry,
  getMetricsOutput,
  Histogram,
} from "@repo/common/metrics";
import { env } from "@/config";
import { logger } from "@/lib/logger";

export const registry = createRegistry({ serviceName: "email-worker" });
export const queueMetrics = createQueueMetrics(registry);

// ── Business metrics ──────────────────────────────────────────────────────────

export const emailsSent = new Counter({
  name: "email_sent_total",
  help: "Total emails sent successfully",
  labelNames: ["type", "provider"],
  registers: [registry],
});

export const emailsFailed = new Counter({
  name: "email_failed_total",
  help: "Total email send failures",
  labelNames: ["type"],
  registers: [registry],
});

export const emailSendDuration = new Histogram({
  name: "email_send_duration_seconds",
  help: "Time to send an email via SMTP or Resend",
  labelNames: ["type", "provider"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// ── Minimal HTTP server for /metrics scraping ─────────────────────────────────

export function startMetricsServer(): void {
  Bun.serve({
    port: env.METRICS_PORT,
    hostname: "0.0.0.0",
    async fetch(req) {
      const { pathname } = new URL(req.url);

      if (pathname === "/metrics") {
        const output = await getMetricsOutput(registry);
        return new Response(output, {
          headers: { "Content-Type": CONTENT_TYPE },
        });
      }

      if (pathname === "/health") {
        return new Response("ok", { status: 200 });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  logger.info(`Metrics server listening on :${env.METRICS_PORT}/metrics`);
}
