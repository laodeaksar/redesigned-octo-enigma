// =============================================================================
// payment-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initRabbitMQ } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting payment-service [${env.NODE_ENV}]…`);

  // ── Validate Midtrans config ─────────────────────────────────────────────
  if (!env.MIDTRANS_SERVER_KEY || !env.MIDTRANS_CLIENT_KEY) {
    console.error("✗ MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY must be set");
    process.exit(1);
  }

  const mode = env.MIDTRANS_IS_PRODUCTION ? "PRODUCTION" : "SANDBOX";
  console.info(`✓ Midtrans configured [${mode}]`);

  // ── RabbitMQ ──────────────────────────────────────────────────────────────
  try {
    await initRabbitMQ();
    console.info("✓ RabbitMQ connected");
  } catch (err) {
    console.warn("⚠ RabbitMQ unavailable — payment events will not be published:", err);
    if (env.NODE_ENV === "production") process.exit(1);
  }

  // ── Elysia server ─────────────────────────────────────────────────────────
  const app = createApp();

  app.listen(env.PORT, () => {
    console.info(`✓ payment-service listening on http://localhost:${env.PORT}`);
    console.info(`✓ Webhook endpoint: ${env.PAYMENT_WEBHOOK_URL}`);
    console.info(`✓ API docs available at http://localhost:${env.PORT}/docs\n`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);
    await app.stop();
    console.info("✓ payment-service stopped");
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

