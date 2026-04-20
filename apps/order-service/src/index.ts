// =============================================================================
// order-service entry point
// =============================================================================

import { scheduleRecurring } from "@repo/common/events";
import { QUEUES } from "@repo/common/events";
import { createApp } from "@/app";
import { env, initMongo, queues, redis } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting order-service [${env.NODE_ENV}]…`);

  // ── MongoDB ──────────────────────────────────────────────────────────────
  try {
    await initMongo();
    console.info("✓ MongoDB connected");
  } catch (err) {
    console.error("✗ MongoDB connection failed:", err);
    process.exit(1);
  }

  // ── BullMQ recurring job — sweep expired orders every 5 min ──────────────
  try {
    await scheduleRecurring(
      queues.orderCancelExpired,
      "expire-sweep",
      5 * 60_000,
      {}
    );
    console.info("✓ BullMQ queues ready (expire-sweep scheduled every 5 min)");
  } catch (err) {
    console.warn("⚠ BullMQ setup failed — order expiry sweep disabled:", err);
    if (env.NODE_ENV === "production") process.exit(1);
  }

  // ── Elysia server ────────────────────────────────────────────────────────
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`✓ order-service listening on http://localhost:${env.PORT}`);
    console.info(`✓ API docs available at http://localhost:${env.PORT}/docs\n`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);
    await app.stop();

    // Close all queues
    await Promise.all(Object.values(queues).map((q) => q.close()));
    await redis.quit();

    const { disconnectMongo } = await import("@repo/database/mongo");
    await disconnectMongo();
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

