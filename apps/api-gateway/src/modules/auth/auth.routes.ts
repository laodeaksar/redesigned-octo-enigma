// =============================================================================
// Auth proxy routes — forward to auth-service
//
// Rate limits:
//   POST /auth/register        — auth limit (20/min)
//   POST /auth/login           — auth limit (20/min)
//   POST /auth/forgot-password — strict limit (5/min)
//   POST /auth/reset-password  — strict limit (5/min)
//   POST /auth/refresh         — default limit (100/min)
//   POST /auth/verify-email    — default limit
//   POST /auth/logout          — default limit
//   GET  /auth/me              — default limit + requireAuth
//
//  /users/me/**               — requireAuth + default limit
// =============================================================================

import { Hono } from "hono";
import { SERVICES } from "@/config";
import { buildTargetUrl, proxyRequest } from "@/lib/proxy";
import { requireAuth } from "@/middleware/auth.middleware";
import {
  authRateLimit,
  defaultRateLimit,
  strictRateLimit,
} from "@/middleware/rate-limit.middleware";

const app = new Hono();

const authBase = SERVICES.auth;

// ── OAuth providers ───────────────────────────────────────────────────────────
app.get("/auth/oauth/providers", defaultRateLimit, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(authBase, c), user: null })
);

// OAuth initiate + callback — proxy all to Better-auth handler in auth-service
app.all("/auth/oauth/:provider", authRateLimit, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(authBase, c), user: null })
);

app.all("/auth/oauth/:provider/callback", authRateLimit, async (c) =>
  proxyRequest(c, { target: buildTargetUrl(authBase, c), user: null })
);

// ── Registration / Login ───────────────────────────────────────────────────────
app.post("/auth/register", authRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

app.post("/auth/login", authRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

// ── Password recovery ─────────────────────────────────────────────────────────
app.post("/auth/forgot-password", strictRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

app.post("/auth/reset-password", strictRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

// ── Token management ──────────────────────────────────────────────────────────
app.post("/auth/refresh", defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

app.post("/auth/verify-email", defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

app.post("/auth/logout", defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: null,
  })
);

// ── Authenticated endpoints ───────────────────────────────────────────────────
app.get("/auth/me", requireAuth, defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  })
);

// ── User profile + addresses — all require auth ───────────────────────────────
app.all("/users/*", requireAuth, defaultRateLimit, async (c) =>
  proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  })
);

export { app as authRoutes };
