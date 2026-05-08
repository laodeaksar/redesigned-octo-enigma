// =============================================================================
// Webhook Events — admin read endpoints
//
//  GET    /admin/webhook-events          — paginated list with filters
//  GET    /admin/webhook-events/stats    — aggregated counts + trend
//  DELETE /admin/webhook-events          — purge entries older than N days
//
// All routes require "admin" or "super_admin" role.
// =============================================================================

import { Hono } from "hono";
import { desc, eq, gte, and, ilike, count, sql } from "drizzle-orm";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { webhookEventsTable } from "@repo/database/drizzle/schema";
import { db } from "@/config";
import { failure, success } from "@repo/common/schemas";

const app = new Hono();

// ── GET /admin/webhook-events — paginated list ────────────────────────────────
app.get(
  "/admin/webhook-events",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    if (!db) return c.json(failure("SERVICE_UNAVAILABLE", "Database not available"), 503);

    const page   = Math.max(1, parseInt(c.req.query("page")  ?? "1",  10));
    const limit  = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50", 10)));
    const offset = (page - 1) * limit;

    const provider      = c.req.query("provider");
    const outcome       = c.req.query("outcome");
    const orderId       = c.req.query("orderId");
    const transactionId = c.req.query("transactionId");
    const ip            = c.req.query("ip");
    const since         = c.req.query("since");

    const conditions = [
      provider      ? eq(webhookEventsTable.provider,      provider)                           : undefined,
      outcome       ? eq(webhookEventsTable.outcome,        outcome)                            : undefined,
      orderId       ? ilike(webhookEventsTable.orderId,     `%${orderId}%`)                     : undefined,
      transactionId ? ilike(webhookEventsTable.transactionId, `%${transactionId}%`)             : undefined,
      ip            ? ilike(webhookEventsTable.ip,          `%${ip}%`)                          : undefined,
      since         ? gte(webhookEventsTable.createdAt,     new Date(since))                    : undefined,
    ].filter((v): v is NonNullable<typeof v> => v != null);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(webhookEventsTable)
        .where(where)
        .orderBy(desc(webhookEventsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(webhookEventsTable)
        .where(where),
    ]);

    return c.json(success({
      items: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }));
  }
);

// ── GET /admin/webhook-events/stats — aggregated analytics ───────────────────
app.get(
  "/admin/webhook-events/stats",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    if (!db) return c.json(failure("SERVICE_UNAVAILABLE", "Database not available"), 503);

    const sinceParam = c.req.query("since");
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 7 * 86400_000);

    const [byOutcome, byProvider, recentTrend, duplicateRate] = await Promise.all([
      // Breakdown by outcome
      db
        .select({
          outcome: webhookEventsTable.outcome,
          count:   count(),
        })
        .from(webhookEventsTable)
        .where(gte(webhookEventsTable.createdAt, since))
        .groupBy(webhookEventsTable.outcome)
        .orderBy(desc(count())),

      // Breakdown by provider
      db
        .select({
          provider: webhookEventsTable.provider,
          outcome:  webhookEventsTable.outcome,
          count:    count(),
        })
        .from(webhookEventsTable)
        .where(gte(webhookEventsTable.createdAt, since))
        .groupBy(webhookEventsTable.provider, webhookEventsTable.outcome)
        .orderBy(desc(count())),

      // Hourly trend over the last 24 h
      db
        .select({
          hour:  sql<string>`to_char(date_trunc('hour', ${webhookEventsTable.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
          outcome: webhookEventsTable.outcome,
          count: count(),
        })
        .from(webhookEventsTable)
        .where(gte(webhookEventsTable.createdAt, new Date(Date.now() - 86400_000)))
        .groupBy(
          sql`date_trunc('hour', ${webhookEventsTable.createdAt})`,
          webhookEventsTable.outcome
        )
        .orderBy(sql`date_trunc('hour', ${webhookEventsTable.createdAt})`),

      // Duplicate + attack rate summary
      db
        .select({
          outcome: webhookEventsTable.outcome,
          count:   count(),
        })
        .from(webhookEventsTable)
        .where(gte(webhookEventsTable.createdAt, new Date(Date.now() - 86400_000)))
        .groupBy(webhookEventsTable.outcome),
    ]);

    const totalLast24h   = duplicateRate.reduce((s, r) => s + Number(r.count), 0);
    const attacksLast24h = duplicateRate
      .filter(r => r.outcome === "invalid_signature")
      .reduce((s, r) => s + Number(r.count), 0);
    const duplicatesLast24h = duplicateRate
      .filter(r => r.outcome === "duplicate")
      .reduce((s, r) => s + Number(r.count), 0);
    const forwardedLast24h = duplicateRate
      .filter(r => r.outcome === "forwarded" || r.outcome === "sig_skipped")
      .reduce((s, r) => s + Number(r.count), 0);

    return c.json(success({
      since: since.toISOString(),
      total: byOutcome.reduce((s, r) => s + Number(r.count), 0),
      byOutcome,
      byProvider,
      recentTrend,
      last24h: {
        total:      totalLast24h,
        forwarded:  forwardedLast24h,
        duplicates: duplicatesLast24h,
        attacks:    attacksLast24h,
        duplicateRate: totalLast24h > 0
          ? `${((duplicatesLast24h / totalLast24h) * 100).toFixed(1)}%`
          : "0%",
        attackRate: totalLast24h > 0
          ? `${((attacksLast24h / totalLast24h) * 100).toFixed(1)}%`
          : "0%",
      },
    }));
  }
);

// ── DELETE /admin/webhook-events — purge old entries ─────────────────────────
app.delete(
  "/admin/webhook-events",
  requireAuth,
  requireRole("admin", "super_admin"),
  async (c) => {
    if (!db) return c.json(failure("SERVICE_UNAVAILABLE", "Database not available"), 503);

    const olderThanDays = Math.max(1, parseInt(c.req.query("olderThanDays") ?? "90", 10));
    const cutoff = new Date(Date.now() - olderThanDays * 86400_000);

    const deleted = await db
      .delete(webhookEventsTable)
      .where(sql`${webhookEventsTable.createdAt} < ${cutoff}`)
      .returning({ id: webhookEventsTable.id });

    return c.json(success({
      deleted:      deleted.length,
      olderThanDays,
      cutoff:       cutoff.toISOString(),
    }));
  }
);

export { app as webhookEventsRoutes };
