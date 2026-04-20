// =============================================================================
// auth-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initRabbitMQ } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting auth-service [${env.NODE_ENV}]…`);

  // ── RabbitMQ connection ──────────────────────────────────────────────────
  try {
    await initRabbitMQ();
    console.info("✓ RabbitMQ connected");
  } catch (err) {
    console.warn("⚠ RabbitMQ unavailable — email events will not be published:", err);
    // Non-fatal in development — auth still works without MQ
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

  // Crash on unhandled promise rejections
  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled rejection:", reason);
    process.exit(1);
  });
}

await bootstrap();

