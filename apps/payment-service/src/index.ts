// =============================================================================
// payment-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env } from "@/config";

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
  console.info(`\n🚀 Starting payment-service [${env.NODE_ENV}]…`);

  const mode = env.MIDTRANS_IS_PRODUCTION ? "PRODUCTION" : "SANDBOX";
  console.info(`✓ Midtrans configured [${mode}]`);

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
}

await bootstrap();
