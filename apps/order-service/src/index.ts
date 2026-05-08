// =============================================================================
// order-service entry point
// =============================================================================

import { createApp } from "@/app";
import { env, initMongo } from "@/config";

async function bootstrap() {
  console.info(`\n🚀 Starting order-service [${env.NODE_ENV}]…`);

  // ── MongoDB ──────────────────────────────────────────────────────────────
  try {
    await initMongo();
    console.info("✓ MongoDB connected");
  } catch (err) {
    console.warn(
      "⚠ MongoDB connection failed — order persistence unavailable:",
      (err as Error).message?.split("\n")[0]
    );
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
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

    try {
      const { disconnectMongo } = await import("@repo/database/mongo");
      await disconnectMongo();
    } catch {}

    console.info("✓ order-service stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", reason => {
    const msg = String(reason);
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("Connection is closed") ||
      msg.includes("MongooseServerSelectionError")
    ) {
      console.warn("[Connection] Non-fatal warning:", msg.split("\n")[0]);
      return;
    }
    console.error("[FATAL] Unhandled rejection:", reason);
    process.exit(1);
  });
}

await bootstrap();
