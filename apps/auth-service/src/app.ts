// =============================================================================
// Elysia app factory
// =============================================================================

import Elysia from "elysia";
import { cors } from "@elysiajs/cors";

import { elysiaErrorHandler } from "@repo/common/errors";

import { swaggerPlugin } from "@/plugins/swagger.plugin";
import { healthRoutes } from "@/modules/health/health.routes";
import { authRoutes } from "@/modules/auth/auth.routes";
import { oauthRoutes, betterAuthHandler } from "@/modules/auth/oauth.routes";
import { usersRoutes } from "@/modules/users/users.routes";
import { metricsRoutes } from "@/metrics";
import { env } from "@/config";

export function createApp() {
  return new Elysia()
    // ── Global plugins ──────────────────────────────────────────────────────
    .use(
      cors({
        origin: env.NODE_ENV === "development"
          ? true
          : env.BETTER_AUTH_URL,
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
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
    .use(authRoutes)
    .use(oauthRoutes)
    .use(betterAuthHandler)
    .use(usersRoutes);
}

export type App = ReturnType<typeof createApp>;

