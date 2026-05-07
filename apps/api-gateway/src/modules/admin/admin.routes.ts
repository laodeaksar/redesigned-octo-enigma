// =============================================================================
// Admin proxy routes — forward to auth-service /admin/* endpoints
// All routes require admin or super_admin role.
//
//  GET    /admin/users                      → auth-service
//  PATCH  /admin/users/:id/role             → auth-service
//  POST   /admin/users/:id/ban              → auth-service
//  POST   /admin/users/:id/unban            → auth-service
//  POST   /admin/users/:id/revoke-sessions  → auth-service
//  DELETE /admin/users/:id                  → auth-service
//
//  ALL    /api/auth/*                       → auth-service (better-auth admin endpoints)
//
//  GET    /admin/audit-logs                 → local (audit log reader)
//  GET    /admin/audit-logs/stats           → local
//  DELETE /admin/audit-logs                 → local
// =============================================================================

import { Hono } from "hono";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { defaultRateLimit, strictRateLimit } from "@/middleware/rate-limit.middleware";
import { proxyRequest, buildTargetUrl } from "@/lib/proxy";
import { auditLogsRoutes } from "./audit-logs.routes";
import { SERVICES } from "@/config";

const app = new Hono();

const authBase = SERVICES.auth;

// ── Audit log endpoints (served locally — not proxied) ────────────────────────
app.route("/", auditLogsRoutes);

// ── Better-auth built-in admin endpoints (/api/auth/admin/*) ──────────────────
app.all(
  "/api/auth/*",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

// ── Custom admin user management endpoints ─────────────────────────────────────

app.get(
  "/admin/users",
  requireAuth,
  requireRole("admin", "super_admin"),
  defaultRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

app.patch(
  "/admin/users/:id/role",
  requireAuth,
  requireRole("admin", "super_admin"),
  strictRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

app.post(
  "/admin/users/:id/ban",
  requireAuth,
  requireRole("admin", "super_admin"),
  strictRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

app.post(
  "/admin/users/:id/unban",
  requireAuth,
  requireRole("admin", "super_admin"),
  strictRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

app.post(
  "/admin/users/:id/revoke-sessions",
  requireAuth,
  requireRole("admin", "super_admin"),
  strictRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

app.delete(
  "/admin/users/:id",
  requireAuth,
  requireRole("admin", "super_admin"),
  strictRateLimit,
  async (c) => proxyRequest(c, { target: buildTargetUrl(authBase, c), user: c.var.user }),
);

export { app as adminRoutes };
