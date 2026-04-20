// =============================================================================
// email-worker entry point
// No HTTP server — pure BullMQ worker process
// =============================================================================

import { env, redis } from "@/config";
import { verifyMailer } from "@/lib/mailer";
import { startWorkers, closeWorkers } from "@/consumer";

async function bootstrap() {
  console.info(`\n📧 Starting email-worker [${env.NODE_ENV}]…`);

  // ── Verify mailer transport ──────────────────────────────────────────────
  try {
    await verifyMailer();
  } catch (err) {
    console.error("✗ Mailer transport verification failed:", err);
    process.exit(1);
  }

  // ── Start BullMQ workers ─────────────────────────────────────────────────
  const workers = startWorkers();
  console.info("✓ email-worker is running — waiting for jobs…");

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);

    // closeWorkers waits for in-flight jobs to finish before closing
    await closeWorkers(workers);
    await redis.quit();

    console.info("✓ email-worker stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled rejection:", reason);
    process.exit(1);
  });
}

await bootstrap();

