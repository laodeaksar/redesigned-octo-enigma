// =============================================================================
// Admin proxy routes — forward to auth-service /admin/* endpoints
// All routes require admin or super_admin role.
//
//  GET    /admin/users             → auth-service
//  PATCH  /admin/users/:id/role   → auth-service
//  POST   /admin/users/:id/ban    → auth-service
//  POST   /admin/users/:id/unban  → auth-service
//  POST   /admin/users/:id/revoke-sessions → auth-service
//  DELETE /admin/users/:id        → auth-service
//
//  ALL    /api/auth/*             → auth-service (better-auth built-in endpoints)
// =============================================================================

import { Hono } from "hono";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { defaultRateLimit, strictRateLimit } from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { SERVICES } from "@/config";

const app = new Hono();

const authBase = SERVICES.auth;

// ── Better-auth built-in admin endpoints (/api/auth/admin/*) ──────────────────
// These are exposed by the better-auth admin plugin automatically.
app.all("/api/auth/*", requireAuth, requireRole("admin", "super_admin"), defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// ── Custom admin endpoints ─────────────────────────────────────────────────────

// List users
app.get("/admin/users", requireAuth, requireRole("admin", "super_admin"), defaultRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// Set user role
app.patch("/admin/users/:id/role", requireAuth, requireRole("admin", "super_admin"), strictRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// Ban user
app.post("/admin/users/:id/ban", requireAuth, requireRole("admin", "super_admin"), strictRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// Unban user
app.post("/admin/users/:id/unban", requireAuth, requireRole("admin", "super_admin"), strictRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// Revoke user sessions
app.post("/admin/users/:id/revoke-sessions", requireAuth, requireRole("admin", "super_admin"), strictRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

// Delete user
app.delete("/admin/users/:id", requireAuth, requireRole("admin", "super_admin"), strictRateLimit, async (c) => {
  return proxyRequest(c, {
    target: buildTargetUrl(authBase, c),
    user: c.var.user,
  });
});

export { app as adminRoutes };
