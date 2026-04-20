// =============================================================================
// api-gateway entry point — Bun.serve
// =============================================================================

import { createApp } from "@/app";
import { env, initRedis } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting api-gateway [${env.NODE_ENV}]…`);

  // ── Redis ─────────────────────────────────────────────────────────────────
  try {
    await initRedis();
    console.info("✓ Redis connected (rate limiting active)");
  } catch (err) {
    console.warn("⚠ Redis unavailable — rate limiting disabled:", err);
    // Non-fatal: rate limiter degrades gracefully (allow-all mode)
    if (env.NODE_ENV === "production") process.exit(1);
  }

  // ── Hono app ──────────────────────────────────────────────────────────────
  const app = createApp();

  const server = Bun.serve({
    port: env.PORT,
    hostname: "0.0.0.0",
    fetch: app.fetch,
    // Enable keep-alive for upstream connections
    reusePort: true,
  });

  console.info(`✓ api-gateway listening on http://localhost:${env.PORT}`);
  console.info(`✓ API docs available at http://localhost:${env.PORT}/docs`);
  console.info(`\nDownstream services:`);
  console.info(`  auth-service    → ${env.AUTH_SERVICE_URL}`);
  console.info(`  product-service → ${env.PRODUCT_SERVICE_URL}`);
  console.info(`  order-service   → ${env.ORDER_SERVICE_URL}`);
  console.info(`  payment-service → ${env.PAYMENT_SERVICE_URL}\n`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);
    server.stop(true);

    const { getRedis } = await import("@/config");
    await getRedis()?.quit();

    console.info("✓ api-gateway stopped");
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

