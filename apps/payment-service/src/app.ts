// =============================================================================
// Elysia app factory
// =============================================================================

import Elysia from "elysia";
import { cors } from "@elysiajs/cors";

import { elysiaErrorHandler } from "@repo/common/errors";

import { swaggerPlugin } from "@/plugins/swagger.plugin";
import { healthRoutes } from "@/modules/health/health.routes";
import { paymentsRoutes } from "@/modules/payments/payments.routes";
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
          "x-webhook-source",
        ],
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      }),
    )
    .use(swaggerPlugin)
    .onError(elysiaErrorHandler)
    .onRequest(({ request }) => {
      if (env.NODE_ENV === "development") {
        console.info(`→ ${request.method} ${new URL(request.url).pathname}`);
      }
    })
    .use(healthRoutes)
    .use(paymentsRoutes);
}

export type App = ReturnType<typeof createApp>;
