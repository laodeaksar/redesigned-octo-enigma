// =============================================================================
// product-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initRedis, initRabbitMQ } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting product-service [${env.NODE_ENV}]…`);

  // ── Redis ────────────────────────────────────────────────────────────────
  const redis = initRedis();
  if (redis) {
    try {
      await redis.connect();
      console.info("✓ Redis connected");
    } catch {
      console.warn("⚠ Redis unavailable — running without cache");
    }
  } else {
    console.info("ℹ Redis disabled (REDIS_URL not set)");
  }

  // ── RabbitMQ ─────────────────────────────────────────────────────────────
  try {
    await initRabbitMQ();
    console.info("✓ RabbitMQ connected");
  } catch (err) {
    console.warn("⚠ RabbitMQ unavailable — stock events will not be published:", err);
    if (env.NODE_ENV === "production") process.exit(1);
  }

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
    const r = redis;
    if (r) await r.quit();
    console.info("✓ Server closed");
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

