// =============================================================================
// Bull Board — job queue monitoring dashboard (disabled when Redis unavailable)
// =============================================================================

import { Hono } from "hono";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";

// ── Hono app ──────────────────────────────────────────────────────────────────

const app = new Hono();

// Protect the queue dashboard — admin only
app.use("/admin/queues/*", requireAuth, requireRole("admin", "super_admin"));

// Bull Board is disabled in this environment (no Redis / serveStatic incompatibility).
// Return a simple status page instead.
app.get("/admin/queues", async (c) => {
  return c.json({
    status: "disabled",
    message: "Bull Board UI is not available in this environment (requires Redis + compatible hono adapter).",
  });
});

export { app as bullBoardRoutes };
