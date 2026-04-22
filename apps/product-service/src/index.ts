// =============================================================================
// product-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, redis, cacheRedis, queues } from "@/config";
import { startWorkers, closeWorkers } from "@/worker";

async function bootstrap() {
  console.info(`\n🚀 Starting product-service [${env.NODE_ENV}]…`);

  // ── Redis ────────────────────────────────────────────────────────────────
  try {
    await redis.ping();
    console.info("✓ Redis connected (cache + BullMQ queues)");
  } catch {
    console.warn("⚠ Redis unavailable — running without cache/queues");
    if (env.NODE_ENV === "production") process.exit(1);
  }

  // Connect cache redis (lazy)
  await cacheRedis.connect().catch(() => {
    console.warn("⚠ Cache Redis unavailable — running without response cache");
  });

  // ── BullMQ workers ────────────────────────────────────────────────────────
  const workers = startWorkers();
  console.info("✓ BullMQ workers started (stock-deduct, stock-restore)");

  // ── Elysia server ────────────────────────────────────────────────────────
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`✓ product-service listening on http://localhost:${env.PORT}`);
    console.info(`✓ API docs available at http://localhost:${env.PORT}/docs\n`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);

    // 1. Stop HTTP server
    await app.stop();

    // 2. Drain workers — let in-flight stock jobs finish
    await closeWorkers(workers);

    // 3. Close queues (producers)
    await Promise.all(Object.values(queues).map((q) => q.close()));

    // 4. Disconnect Redis
    await Promise.allSettled([redis.quit(), cacheRedis.quit()]);

    console.info("✓ product-service stopped");
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

