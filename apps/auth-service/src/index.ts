// =============================================================================
// auth-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initRabbitMQ } from "@/config";

// Suppress non-fatal unhandled rejections from Redis/BullMQ when unavailable
process.on("unhandledRejection", (reason) => {
  const msg = String(reason);
  if (msg.includes("ECONNREFUSED") || msg.includes("Connection is closed") || msg.includes("connect")) {
    console.warn("[Redis/BullMQ] Connection warning (non-fatal):", msg.split("\n")[0]);
    return;
  }
  console.error("[FATAL] Unhandled rejection:", reason);
  process.exit(1);
});

async function bootstrap() {
  console.info(`\n🚀 Starting auth-service [${env.NODE_ENV}]…`);

  // ── RabbitMQ connection ──────────────────────────────────────────────────
  try {
    await initRabbitMQ();
    console.info("✓ RabbitMQ connected");
  } catch (err) {
    console.warn("⚠ RabbitMQ unavailable — email events will not be published:", (err as Error).message);
    if (env.NODE_ENV === "production") process.exit(1);
  }

  // ── Elysia server ────────────────────────────────────────────────────────
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`✓ auth-service listening on http://localhost:${env.PORT}`);
    console.info(`✓ API docs available at http://localhost:${env.PORT}/docs\n`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);
    await app.stop();
    console.info("✓ Server closed");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

await bootstrap();
