// =============================================================================
// email-worker entry point
// No HTTP server — pure BullMQ worker process
// =============================================================================

import { env, redis } from "@/config";
import { logger } from "@/lib/logger";
import { verifyMailer } from "@/lib/mailer";
import { startWorkers, closeWorkers } from "@/consumer";
import { startMetricsServer } from "@/metrics";

async function bootstrap() {
  logger.info(`📧 Starting email-worker [${env.NODE_ENV}]…`);

  // ── Verify mailer transport ──────────────────────────────────────────────
  try {
    await verifyMailer();
  } catch (err) {
    logger.fatal({ err }, "Mailer transport verification failed — exiting");
    process.exit(1);
  }

  // ── Metrics server (Prometheus scraping) ─────────────────────────────────
  startMetricsServer();

  // ── Start BullMQ workers ─────────────────────────────────────────────────
  const workers = startWorkers();
  logger.info("✓ email-worker is running — waiting for jobs…");

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully…`);
    await closeWorkers(workers);
    await redis.quit();
    logger.info("✓ email-worker stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT",  () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection — exiting");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — exiting");
    process.exit(1);
  });
}

await bootstrap();
