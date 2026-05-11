// =============================================================================
// Hono app factory — checkout service
// =============================================================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { normalizeError } from "@repo/common/errors";
import { failure } from "@repo/common/schemas";

import { env } from "@/config";
import { buildCorsOrigin } from "@/lib/cors";
import { requestIdMiddleware } from "@/middleware/request-id.middleware";
import { healthRoutes } from "@/modules/health/health.routes";
import { checkoutRoutes } from "@/modules/checkout/checkout.routes";

export function createApp() {
  const app = new Hono();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use("*", secureHeaders());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    "*",
    cors({
      origin: buildCorsOrigin(env.CORS_ORIGINS),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
      exposeHeaders: ["x-request-id"],
      credentials: true,
      maxAge: 86_400,
    })
  );

  // ── Request logging (dev only) ─────────────────────────────────────────────
  if (env.NODE_ENV === "development") {
    app.use("*", logger());
    app.use("*", prettyJSON());
  }

  // ── Request ID ────────────────────────────────────────────────────────────
  app.use("*", requestIdMiddleware);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.route("/", healthRoutes);
  app.route("/", checkoutRoutes);

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.notFound(c =>
    c.json(
      failure("NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`),
      404
    )
  );

  // ── Global error handler ──────────────────────────────────────────────────
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
