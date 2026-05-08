// =============================================================================
// Webhook Events — admin read endpoints
//
//  GET    /admin/webhook-events          — paginated list (filters: provider,
//                                          outcome, orderId, transactionId,
//                                          ip, paymentStatus, since, until)
//  GET    /admin/webhook-events/stats    — aggregated counts, hourly trend,
//                                          top attacking IPs, 24h summary
//  GET    /admin/webhook-events/:id      — single event with full raw payload
//  DELETE /admin/webhook-events          — purge entries older than N days
//
// All routes require "admin" or "super_admin" role.
// =============================================================================

import { db } from "@/config";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import { and, count, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { Hono } from "hono";

import { failure, success } from "@repo/common/schemas";
import { webhookEventsTable } from "@repo/database/drizzle/schema";

const app = new Hono();

// ── GET /admin/webhook-events — paginated list ────────────────────────────────
app.get(
  "/admin/webhook-events",
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

    const provider = c.req.query("provider");
    const outcome = c.req.query("outcome");
    const orderId = c.req.query("orderId");
    const transactionId = c.req.query("transactionId");
    const ip = c.req.query("ip");
    const paymentStatus = c.req.query("paymentStatus");
    const since = c.req.query("since");
    const until = c.req.query("until");

    const conditions = [
      provider ? eq(webhookEventsTable.provider, provider) : undefined,
      outcome ? eq(webhookEventsTable.outcome, outcome) : undefined,
      paymentStatus
        ? eq(webhookEventsTable.paymentStatus, paymentStatus)
        : undefined,
      orderId ? ilike(webhookEventsTable.orderId, `%${orderId}%`) : undefined,
      transactionId
        ? ilike(webhookEventsTable.transactionId, `%${transactionId}%`)
        : undefined,
      ip ? ilike(webhookEventsTable.ip, `%${ip}%`) : undefined,
      since ? gte(webhookEventsTable.createdAt, new Date(since)) : undefined,
      until ? lte(webhookEventsTable.createdAt, new Date(until)) : undefined,
    ].filter((v): v is NonNullable<typeof v> => v != null);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [countRow]] = await Promise.all([
      db
        .select({
          id: webhookEventsTable.id,
          createdAt: webhookEventsTable.createdAt,
          provider: webhookEventsTable.provider,
          outcome: webhookEventsTable.outcome,
          outcomeDetail: webhookEventsTable.outcomeDetail,
          ip: webhookEventsTable.ip,
          transactionId: webhookEventsTable.transactionId,
          orderId: webhookEventsTable.orderId,
          paymentStatus: webhookEventsTable.paymentStatus,
          // rawPayload excluded from list — fetch via GET /:id
        })
        .from(webhookEventsTable)
        .where(where)
        .orderBy(desc(webhookEventsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(webhookEventsTable).where(where),
    ]);

    const total = Number(countRow?.total ?? 0);

    return c.json(
      success({
        items: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  }
);

// ── GET /admin/webhook-events/stats — aggregated analytics ───────────────────
// NOTE: must be registered before /:id to avoid route shadowing
app.get(
  "/admin/webhook-events/stats",
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

    // Outcomes that indicate an attack or abuse attempt
    const ATTACK_OUTCOMES = ["invalid_signature", "not_allowed"] as const;

    const [byOutcome, byProvider, recentTrend, last24hRows, topIps] =
      await Promise.all([
        // Breakdown by outcome over the window
        db
          .select({ outcome: webhookEventsTable.outcome, count: count() })
          .from(webhookEventsTable)
          .where(gte(webhookEventsTable.createdAt, since))
          .groupBy(webhookEventsTable.outcome)
          .orderBy(desc(count())),

        // Breakdown by provider + outcome over the window
        db
          .select({
            provider: webhookEventsTable.provider,
            outcome: webhookEventsTable.outcome,
            count: count(),
          })
          .from(webhookEventsTable)
          .where(gte(webhookEventsTable.createdAt, since))
          .groupBy(webhookEventsTable.provider, webhookEventsTable.outcome)
          .orderBy(desc(count())),

        // Hourly trend over the last 24 h
        db
          .select({
            hour: sql<string>`to_char(date_trunc('hour', ${webhookEventsTable.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
            outcome: webhookEventsTable.outcome,
            count: count(),
          })
          .from(webhookEventsTable)
          .where(
            gte(webhookEventsTable.createdAt, new Date(Date.now() - 86_400_000))
          )
          .groupBy(
            sql`date_trunc('hour', ${webhookEventsTable.createdAt})`,
            webhookEventsTable.outcome
          )
          .orderBy(sql`date_trunc('hour', ${webhookEventsTable.createdAt})`),

        // Last-24h outcome breakdown for summary metrics
        db
          .select({ outcome: webhookEventsTable.outcome, count: count() })
          .from(webhookEventsTable)
          .where(
            gte(webhookEventsTable.createdAt, new Date(Date.now() - 86_400_000))
          )
          .groupBy(webhookEventsTable.outcome),

        // Top 10 IPs by total deliveries over the window
        db
          .select({
            ip: webhookEventsTable.ip,
            total: count(),
            attacks: sql<number>`count(*) filter (where ${webhookEventsTable.outcome} in ('invalid_signature','not_allowed'))`,
            blocked: sql<number>`count(*) filter (where ${webhookEventsTable.outcome} = 'not_allowed')`,
            forwarded: sql<number>`count(*) filter (where ${webhookEventsTable.outcome} in ('forwarded','sig_skipped'))`,
          })
          .from(webhookEventsTable)
          .where(gte(webhookEventsTable.createdAt, since))
          .groupBy(webhookEventsTable.ip)
          .orderBy(desc(count()))
          .limit(10),
      ]);

    const totalLast24h = last24hRows.reduce((s, r) => s + Number(r.count), 0);
    const attacksLast24h = last24hRows
      .filter(r => (ATTACK_OUTCOMES as readonly string[]).includes(r.outcome))
      .reduce((s, r) => s + Number(r.count), 0);
    const duplicatesLast24h = last24hRows
      .filter(r => r.outcome === "duplicate")
      .reduce((s, r) => s + Number(r.count), 0);
    const forwardedLast24h = last24hRows
      .filter(r => r.outcome === "forwarded" || r.outcome === "sig_skipped")
      .reduce((s, r) => s + Number(r.count), 0);
    const blockedLast24h = last24hRows
      .filter(r => r.outcome === "not_allowed")
      .reduce((s, r) => s + Number(r.count), 0);

    const pct = (n: number, d: number) =>
      d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "0%";

    return c.json(
      success({
        since: since.toISOString(),
        total: byOutcome.reduce((s, r) => s + Number(r.count), 0),
        byOutcome,
        byProvider,
        recentTrend,
        topIps: topIps.map(r => ({
          ip: r.ip,
          total: Number(r.total),
          attacks: Number(r.attacks),
          blocked: Number(r.blocked),
          forwarded: Number(r.forwarded),
        })),
        last24h: {
          total: totalLast24h,
          forwarded: forwardedLast24h,
          duplicates: duplicatesLast24h,
          attacks: attacksLast24h,
          blocked: blockedLast24h,
          duplicateRate: pct(duplicatesLast24h, totalLast24h),
          attackRate: pct(attacksLast24h, totalLast24h),
          blockRate: pct(blockedLast24h, totalLast24h),
        },
      })
    );
  }
);

// ── GET /admin/webhook-events/:id — single event detail ──────────────────────
app.get(
  "/admin/webhook-events/:id",
  requireAuth,
  requireRole("admin", "super_admin"),
  async c => {
    if (!db) {
      return c.json(
        failure("SERVICE_UNAVAILABLE", "Database not available"),
        503
      );
    }

    const id = c.req.param("id");

    const [row] = await db
      .select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.id, id))
      .limit(1);

    if (!row) {
      return c.json(failure("NOT_FOUND", `Webhook event ${id} not found`), 404);
    }

    return c.json(success(row));
  }
);

// ── DELETE /admin/webhook-events — purge old entries ─────────────────────────
app.delete(
  "/admin/webhook-events",
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
      Number.parseInt(c.req.query("olderThanDays") ?? "90", 10)
    );
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);

    const deleted = await db
      .delete(webhookEventsTable)
      .where(sql`${webhookEventsTable.createdAt} < ${cutoff}`)
      .returning({ id: webhookEventsTable.id });

    return c.json(
      success({
        deleted: deleted.length,
        olderThanDays,
        cutoff: cutoff.toISOString(),
      })
    );
  }
);

export { app as webhookEventsRoutes };
