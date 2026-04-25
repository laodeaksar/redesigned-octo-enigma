// =============================================================================
// Elysia app factory
// =============================================================================

import Elysia from "elysia";
import { cors } from "@elysiajs/cors";

import { elysiaErrorHandler } from "@repo/common/errors";

import { swaggerPlugin } from "@/plugins/swagger.plugin";
import { healthRoutes } from "@/modules/health/health.routes";
import { categoriesRoutes } from "@/modules/categories/categories.routes";
import { productsRoutes } from "@/modules/products/products.routes";
import { reviewsRoutes } from "@/modules/reviews/reviews.routes";
import { metricsRoutes } from "@/metrics";
import { env } from "@/config";

export function createApp() {
  return new Elysia()
    // ── Global plugins ──────────────────────────────────────────────────────
    .use(
      cors({
        origin: env.NODE_ENV === "development" ? true : false,
        // In production, product-service is only called by api-gateway
        // (no direct browser access needed)
        allowedHeaders: [
          "Content-Type",
          "x-user-id",
          "x-user-email",
          "x-user-role",
          "x-request-id",
        ],
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      })
    )
    .use(swaggerPlugin)

    // ── Global error handler ─────────────────────────────────────────────────
    .onError(elysiaErrorHandler)

    // ── Request logging (dev only) ───────────────────────────────────────────
    .onRequest(({ request }) => {
      if (env.NODE_ENV === "development") {
        console.info(`→ ${request.method} ${new URL(request.url).pathname}`);
      }
    })

    // ── Routes ────────────────────────────────────────────────────────────────
    .use(healthRoutes)
    .use(metricsRoutes)
    .use(categoriesRoutes)
    .use(productsRoutes)
    .use(reviewsRoutes);
}

export type App = ReturnType<typeof createApp>;

