// =============================================================================
// Elysia app factory
// =============================================================================

import Elysia from "elysia";
import { cors } from "@elysiajs/cors";

import { elysiaErrorHandler } from "@repo/common/errors";

import { swaggerPlugin } from "@/plugins/swagger.plugin";
import { healthRoutes } from "@/modules/health/health.routes";
import { ordersRoutes } from "@/modules/orders/orders.routes";
import { vouchersRoutes } from "@/modules/vouchers/vouchers.routes";
import { shippingRoutes } from "@/modules/shipping/shipping.routes";
import { analyticsRoutes } from "@/modules/analytics/analytics.routes";
import { metricsRoutes } from "@/metrics";
import { env } from "@/config";

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
    .use(ordersRoutes)
    .use(vouchersRoutes)
    .use(shippingRoutes)
    .use(analyticsRoutes);
}

export type App = ReturnType<typeof createApp>;

