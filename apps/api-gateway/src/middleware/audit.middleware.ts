// =============================================================================
// Audit middleware — logs failed auth/authz attempts to the database,
// then increments the Redis failure counter for the requesting IP.
// If the IP crosses the configured threshold, it is automatically blocked.
//
// Captures 401 and 403 responses — fire-and-forget (never blocks the response).
// =============================================================================

import { createMiddleware } from "hono/factory";
import { auditLogsTable } from "@repo/database/drizzle/schema";
import { db } from "@/config";
import { extractIp, recordIpFailure } from "@/middleware/ip-blocklist.middleware";

export const auditMiddleware = createMiddleware(async (c, next) => {
  await next();

  const status = c.res.status;
  if (status !== 401 && status !== 403) return;

  // Extract client IP
  const ip = extractIp(c.req);

  // Parse the response body for the specific error code
  let errorCode = status === 401 ? "UNAUTHORIZED" : "FORBIDDEN";
  try {
    const body = await c.res.clone().json() as { error?: { code?: string } };
    if (body?.error?.code) errorCode = body.error.code;
  } catch { /* ignore */ }

  // Extract user context (may be null if auth failed before user was set)
  const user = c.var.user;

  // ── 1. Write to audit log DB (fire-and-forget) ────────────────────────────
  if (db) {
    db.insert(auditLogsTable)
      .values({
        ip,
        method:    c.req.method,
        path:      c.req.path,
        statusCode: status,
        errorCode,
        userId:    user?.id    ?? null,
        userEmail: user?.email ?? null,
        userRole:  user?.role  ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      })
      .catch((err: unknown) => {
        console.warn("[audit] Failed to write audit log:", err);
      });
  }

  // ── 2. Increment failure counter → auto-block if threshold reached ────────
  // Skip counting if the block check itself caused the 403 (to avoid loops)
  if (errorCode !== "IP_BLOCKED") {
    recordIpFailure(ip).catch(() => { /* swallow */ });
  }
});
