// =============================================================================
// Health routes
//
//  GET  /health                          — public: ping all services
//  GET  /health/circuit-breakers         — admin: circuit breaker states
//  POST /health/circuit-breakers/reset   — admin: reset all circuit breakers
// =============================================================================

import { Hono } from "hono";
import { SERVICES, getRedis } from "@/config";
import { CircuitBreakerManager } from "@/lib/circuit-breaker";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const app = new Hono();

async function pingService(url: string): Promise<"ok" | "error"> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

// ── Public: basic liveness check ──────────────────────────────────────────────
app.get("/health", async (c) => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    const redis = getRedis();
    await redis?.ping();
    checks["redis"] = "ok";
  } catch {
    checks["redis"] = "error";
  }

  const [authStatus, productStatus, orderStatus, paymentStatus] =
    await Promise.all([
      pingService(SERVICES.auth),
      pingService(SERVICES.product),
      pingService(SERVICES.order),
      pingService(SERVICES.payment),
    ]);

  checks["auth-service"] = authStatus;
  checks["product-service"] = productStatus;
  checks["order-service"] = orderStatus;
  checks["payment-service"] = paymentStatus;

  const allOk = Object.values(checks).every((v) => v === "ok");

  return c.json({
    success: true,
    data: {
      status: allOk ? "ok" : "degraded",
      service: "api-gateway",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date(),
      checks,
    },
  }, allOk ? 200 : 207);
});

// ── Admin: circuit breaker states ─────────────────────────────────────────────
app.get(
  "/health/circuit-breakers",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    const metrics = CircuitBreakerManager.getAllMetrics();
    const allCircuitsOk = Object.values(metrics).every(m => m.state === "closed");

    return c.json({
      success: true,
      data: {
        status: allCircuitsOk ? "ok" : "degraded",
        timestamp: new Date(),
        circuitBreakers: metrics,
      },
    }, allCircuitsOk ? 200 : 207);
  }
);

// ── Admin: reset all circuit breakers ────────────────────────────────────────
app.post(
  "/health/circuit-breakers/reset",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    CircuitBreakerManager.resetAll();
    return c.json({
      success: true,
      message: "All circuit breakers have been reset to closed state",
    });
  }
);

export { app as healthRoutes };
