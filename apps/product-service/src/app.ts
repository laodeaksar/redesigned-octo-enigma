// =============================================================================
// Elysia app factory
// =============================================================================

import { cors } from "@elysiajs/cors";
import { elysiaErrorHandler } from "@repo/common/errors";
import Elysia from "elysia";
import { env } from "@/config";
import { metricsRoutes } from "@/metrics";
import { categoriesRoutes } from "@/modules/categories/categories.routes";
import { healthRoutes } from "@/modules/health/health.routes";
import {
  productsInternalRoutes,
  productsRoutes,
} from "@/modules/products/products.routes";
import { reviewsRoutes } from "@/modules/reviews/reviews.routes";
import { wishlistRoutes } from "@/modules/wishlist/wishlist.routes";
import { swaggerPlugin } from "@/plugins/swagger.plugin";

export function createApp() {
  return (
    new Elysia()
      // ── Global plugins ──────────────────────────────────────────────────────
      .use(
        cors({
          origin: env.NODE_ENV === "development" ? true : false,
          allowedHeaders: [
            "Content-Type",
            "x-user-id",
            "x-user-email",
            "x-user-role",
            "x-request-id",
            "x-internal-key",
            "x-internal-service",
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
      .use(productsInternalRoutes)
      .use(productsRoutes)
      .use(wishlistRoutes)
      .use(reviewsRoutes)
  );
}

export type App = ReturnType<typeof createApp>;
