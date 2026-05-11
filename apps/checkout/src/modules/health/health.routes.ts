// =============================================================================
// Health routes — GET /health, GET /health/ready
// =============================================================================

import { Hono } from "hono";

import { getRedis } from "@/config";

const app = new Hono();

app.get("/health", c =>
  c.json({
    success: true,
    service: "checkout",
    status: "ok",
    timestamp: new Date().toISOString(),
  })
);

app.get("/health/ready", async c => {
  const redis = getRedis();
  let redisOk = false;

  if (redis) {
    try {
      await redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
  }

  return c.json({
    success: true,
    service: "checkout",
    status: "ready",
    dependencies: {
      redis: redis ? (redisOk ? "ok" : "degraded") : "disabled",
    },
    timestamp: new Date().toISOString(),
  });
});

export { app as healthRoutes };
