// =============================================================================
// Elysia app factory
// =============================================================================

import { cors } from "@elysiajs/cors";
import { elysiaErrorHandler } from "@repo/common/errors";
import Elysia from "elysia";
import { env } from "@/config";
import { metricsRoutes } from "@/metrics";
import { analyticsRoutes } from "@/modules/analytics/analytics.routes";
import { healthRoutes } from "@/modules/health/health.routes";
import {
  ordersInternalRoutes,
  ordersRoutes,
} from "@/modules/orders/orders.routes";
import { shippingRoutes } from "@/modules/shipping/shipping.routes";
import { vouchersRoutes } from "@/modules/vouchers/vouchers.routes";
import { swaggerPlugin } from "@/plugins/swagger.plugin";

export function createApp() {
  return new Elysia()
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
    .onError(elysiaErrorHandler)
    .onRequest(({ request }) => {
      if (env.NODE_ENV === "development") {
        console.info(`→ ${request.method} ${new URL(request.url).pathname}`);
      }
    })
    .use(healthRoutes)
    .use(metricsRoutes)
    .use(ordersInternalRoutes)
    .use(ordersRoutes)
    .use(vouchersRoutes)
    .use(shippingRoutes)
    .use(analyticsRoutes);
}

export type App = ReturnType<typeof createApp>;
