// =============================================================================
// apps/checkout — entry point
//
// ACTIVATION NOTE (from ADR-003):
// This service is a scaffold. Activate it (add to Replit workflows + turbo.json)
// only when checkout traffic > 50% of total storefront traffic OR when
// independent deployment cadence is needed.
//
// Until then, checkout lives in apps/web/src/pages/checkout.astro.
// See docs/ADR-003-checkout-architecture.md for the full decision.
// =============================================================================

import { createApp } from "@/app";
import { env, initRedis } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting checkout service [${env.NODE_ENV}]…`);
  console.info(`   API gateway: ${env.API_GATEWAY_URL}`);

  // ── Redis (optional) ──────────────────────────────────────────────────────
  const redisAvailable = await initRedis();
  if (redisAvailable) {
    console.info("✓ Redis connected (response caching active)");
  } else {
    console.warn("⚠ Redis unavailable — caching disabled (degraded gracefully)");
  }

  // ── Hono app ──────────────────────────────────────────────────────────────
  const app = createApp();

  const server = Bun.serve({
    port: env.PORT,
    hostname: "0.0.0.0",
    fetch: app.fetch,
    reusePort: true,
  });

  console.info(`✓ checkout service listening on http://localhost:${server.port}`);
  console.info(`✓ Health: http://localhost:${server.port}/health\n`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down checkout service…`);
    server.stop(true);
    const { getRedis } = await import("@/config");
    await getRedis()?.quit();
    console.info("✓ checkout service stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", reason => {
    console.error("[FATAL] Unhandled rejection:", reason);
    process.exit(1);
  });
}

await bootstrap();
