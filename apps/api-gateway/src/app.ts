// =============================================================================
// Hono app factory
// =============================================================================

import { swaggerUI } from "@hono/swagger-ui";
import { normalizeError } from "@repo/common/errors";
import { failure } from "@repo/common/schemas";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { env } from "@/config";
import { metricsMiddleware, metricsRoutes } from "@/metrics";
import { auditMiddleware } from "@/middleware/audit.middleware";
import { ipBlocklistMiddleware } from "@/middleware/ip-blocklist.middleware";
import { requestIdMiddleware } from "@/middleware/request-id.middleware";
import { adminRoutes } from "@/modules/admin/admin.routes";
import { analyticsRoutes } from "@/modules/analytics/analytics.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { bullBoardRoutes } from "@/modules/bull-board/bull-board.routes";
import { healthRoutes } from "@/modules/health/health.routes";
import { ordersRoutes } from "@/modules/orders/orders.routes";
import { paymentsRoutes } from "@/modules/payments/payments.routes";
import { productsRoutes } from "@/modules/products/products.routes";
import { shippingRoutes } from "@/modules/shipping/shipping.routes";
import { wishlistRoutes } from "@/modules/wishlist/wishlist.routes";

export function createApp() {
  const app = new Hono();

  // ── Metrics (Prometheus scrape endpoint) ─────────────────────────────────
  app.use("*", metricsMiddleware);

  // ── Security headers ───────────────────────────────────────────────────────
  app.use("*", secureHeaders());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGINS,
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
      exposeHeaders: [
        "x-request-id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
      ],
      credentials: true,
      maxAge: 86_400,
    })
  );

  // ── Request logging ────────────────────────────────────────────────────────
  if (env.NODE_ENV === "development") {
    app.use("*", logger());
  }

  // ── Request ID ────────────────────────────────────────────────────────────
  app.use("*", requestIdMiddleware);

  // ── IP blocklist — reject blocked IPs early (before any auth work) ────────
  app.use("*", ipBlocklistMiddleware);

  // ── Audit log — captures 401/403, increments failure counter per IP ───────
  app.use("*", auditMiddleware);

  // ── Pretty JSON in development ────────────────────────────────────────────
  if (env.NODE_ENV === "development") {
    app.use("*", prettyJSON());
  }

  // ── Swagger UI ────────────────────────────────────────────────────────────
  app.get(
    "/docs",
    swaggerUI({
      url: "/docs/openapi.json",
      title: "My Ecommerce API",
    })
  );

  // Simple OpenAPI spec — lists all services and their base paths
  app.get("/docs/openapi.json", (c) =>
    c.json({
      openapi: "3.0.0",
      info: {
        title: "My Ecommerce API Gateway",
        version: "1.0.0",
        description:
          "Single entry point for all My Ecommerce services. " +
          "Each service also exposes its own /docs endpoint for detailed schemas.",
      },
      servers: [
        {
          url:
            env.NODE_ENV === "development"
              ? `http://localhost:${env.PORT}`
              : "",
        },
      ],
      tags: [
        { name: "Auth", description: "→ auth-service" },
        { name: "Products", description: "→ product-service" },
        { name: "Orders", description: "→ order-service" },
        { name: "Payments", description: "→ payment-service" },
      ],
      paths: {},
    })
  );

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.route("/", healthRoutes);
  app.route("/", authRoutes);
  app.route("/", adminRoutes);
  app.route("/", productsRoutes);
  app.route("/", ordersRoutes);
  app.route("/", paymentsRoutes);
  app.route("/", shippingRoutes);
  app.route("/", bullBoardRoutes);
  app.route("/", analyticsRoutes);
  app.route("/", metricsRoutes);
  app.route("/", wishlistRoutes);

  // ── 404 handler ────────────────────────────────────────────────────────────
  app.notFound((c) =>
    c.json(
      failure("NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`),
      404
    )
  );

  // ── Global error handler ───────────────────────────────────────────────────
  app.onError((err, c) => {
    const appError = normalizeError(err);

    if (!appError.isOperational) {
      console.error("[UNHANDLED ERROR]", {
        name: appError.name,
        message: appError.message,
        stack: appError.stack,
        path: c.req.path,
        method: c.req.method,
      });
    }

    return c.json(
      appError.toJSON(),
      appError.statusCode as Parameters<typeof c.json>[1]
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
