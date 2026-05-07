// =============================================================================
// Audit middleware — logs failed auth/authz attempts to the database
//
// Captures 401 and 403 responses and writes a record to `audit_logs`.
// The insert is fire-and-forget (does not block the response).
// =============================================================================

import { createMiddleware } from "hono/factory";
import { auditLogsTable } from "@repo/database/drizzle/schema";
import { db } from "@/config";

/**
 * After every request, if the response is 401 or 403, write an audit log
 * record with: IP, method, path, status code, error code, user context.
 *
 * Safe to fail — errors are swallowed so they never affect the main response.
 */
export const auditMiddleware = createMiddleware(async (c, next) => {
  await next();

  const status = c.res.status;
  if (status !== 401 && status !== 403) return;
  if (!db) return; // DB not available — skip silently

  // Parse the response body for the error code without consuming the stream.
  let errorCode = status === 401 ? "UNAUTHORIZED" : "FORBIDDEN";
  try {
    const cloned = c.res.clone();
    const body = await cloned.json() as { error?: { code?: string } };
    if (body?.error?.code) errorCode = body.error.code;
  } catch {
    // Ignore parse errors — fall back to inferred code
  }

  // Extract client IP — trust X-Forwarded-For in proxy environments
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

  // Extract user context if JWT was already decoded
  const user = c.var.user;

  // Fire-and-forget insert — never block the response
  db.insert(auditLogsTable)
    .values({
      ip,
      method: c.req.method,
      path: c.req.path,
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
});
