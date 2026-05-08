// =============================================================================
// Audit Logs — admin endpoints
//
//  GET    /admin/audit-logs          — paginated list with filters
//  GET    /admin/audit-logs/stats    — summary counts by error code + top IPs
//  DELETE /admin/audit-logs          — purge logs older than N days
//
// All routes require "admin" or "super_admin" role.
// Auth middleware is applied inline per-route for reliable Hono sub-router scoping.
// =============================================================================

import { db } from "@/config";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { and, count, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { Hono } from "hono";

import { failure, success } from "@repo/common/schemas";
import { auditLogsTable } from "@repo/database/drizzle/schema";

const app = new Hono();

// ── GET /admin/audit-logs — paginated list ────────────────────────────────────
app.get(
  "/admin/audit-logs",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    if (!db) {
      return c.json(
        failure("SERVICE_UNAVAILABLE", "Database not available"),
        503
      );
    }

    const page = Math.max(1, Number.parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(c.req.query("limit") ?? "50", 10))
    );
    const offset = (page - 1) * limit;

    const ip = c.req.query("ip");
    const userId = c.req.query("userId");
    const errorCode = c.req.query("errorCode");
    const statusCode = c.req.query("statusCode");
    const since = c.req.query("since");
    const path = c.req.query("path");

    const conditions = [
      ip ? ilike(auditLogsTable.ip, `%${ip}%`) : undefined,
      userId ? eq(auditLogsTable.userId, userId) : undefined,
      errorCode ? eq(auditLogsTable.errorCode, errorCode) : undefined,
      statusCode
        ? eq(auditLogsTable.statusCode, Number.parseInt(statusCode, 10))
        : undefined,
      since ? gte(auditLogsTable.createdAt, new Date(since)) : undefined,
      path ? ilike(auditLogsTable.path, `%${path}%`) : undefined,
    ].filter((v): v is NonNullable<typeof v> => v != null);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(auditLogsTable).where(where),
    ]);

    return c.json(
      success({
        items: rows,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      })
    );
  }
);

// ── GET /admin/audit-logs/stats — aggregated analytics ───────────────────────
app.get(
  "/admin/audit-logs/stats",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    if (!db) {
      return c.json(
        failure("SERVICE_UNAVAILABLE", "Database not available"),
        503
      );
    }

    const sinceParam = c.req.query("since");
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 86_400_000);

    const [byCode, byHour, topIps] = await Promise.all([
      // Breakdown by error code + status
      db
        .select({
          errorCode: auditLogsTable.errorCode,
          statusCode: auditLogsTable.statusCode,
          count: count(),
        })
        .from(auditLogsTable)
        .where(gte(auditLogsTable.createdAt, since))
        .groupBy(auditLogsTable.errorCode, auditLogsTable.statusCode)
        .orderBy(desc(count())),

      // Attempts per hour over the last 24 h
      db
        .select({
          hour: sql<string>`to_char(date_trunc('hour', ${auditLogsTable.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
          count: count(),
        })
        .from(auditLogsTable)
        .where(gte(auditLogsTable.createdAt, new Date(Date.now() - 86_400_000)))
        .groupBy(sql`date_trunc('hour', ${auditLogsTable.createdAt})`)
        .orderBy(sql`date_trunc('hour', ${auditLogsTable.createdAt})`),

      // Top 10 offending IPs
      db
        .select({
          ip: auditLogsTable.ip,
          count: count(),
        })
        .from(auditLogsTable)
        .where(gte(auditLogsTable.createdAt, since))
        .groupBy(auditLogsTable.ip)
        .orderBy(desc(count()))
        .limit(10),
    ]);

    return c.json(
      success({
        since: since.toISOString(),
        total: byCode.reduce((s, r) => s + Number(r.count), 0),
        byErrorCode: byCode,
        byHour,
        topOffendingIps: topIps,
      })
    );
  }
);

// ── DELETE /admin/audit-logs — purge old entries ──────────────────────────────
app.delete(
  "/admin/audit-logs",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    if (!db) {
      return c.json(
        failure("SERVICE_UNAVAILABLE", "Database not available"),
        503
      );
    }

    const olderThanDays = Math.max(
      1,
      Number.parseInt(c.req.query("olderThanDays") ?? "30", 10)
    );
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);

    const deleted = await db
      .delete(auditLogsTable)
      .where(sql`${auditLogsTable.createdAt} < ${cutoff}`)
      .returning({ id: auditLogsTable.id });

    return c.json(
      success({
        deleted: deleted.length,
        olderThanDays,
        cutoff: cutoff.toISOString(),
      })
    );
  }
);

export { app as auditLogsRoutes };
