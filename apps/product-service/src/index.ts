// =============================================================================
// product-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initRedis } from "@/config";
import { startWorkers, closeWorkers } from "@/worker";

async function bootstrap() {
  console.info(`\n🚀 Starting product-service [${env.NODE_ENV}]…`);

  // ── Redis (optional) ──────────────────────────────────────────────────────
  const redisAvailable = await initRedis();
  if (redisAvailable) {
    console.info("✓ Redis connected (cache + BullMQ queues)");
  } else {
    console.warn("⚠ Redis unavailable — running without cache/queues");
  }

  // ── BullMQ workers (no-op when Redis unavailable) ─────────────────────────
  const workers = startWorkers();

  // ── Elysia server ────────────────────────────────────────────────────────
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`✓ product-service listening on http://localhost:${env.PORT}`);
    console.info(`✓ API docs available at http://localhost:${env.PORT}/docs\n`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);

    await app.stop();
    await closeWorkers(workers);

    console.info("✓ product-service stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled rejection:", reason);
    if (env.NODE_ENV === "production") process.exit(1);
  });
}

await bootstrap();
