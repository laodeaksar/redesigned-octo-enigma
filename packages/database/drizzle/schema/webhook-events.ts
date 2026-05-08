// =============================================================================
// Webhook Events — full audit trail for every incoming webhook notification
//
// Written by: api-gateway webhook-verify middleware
// One row per delivery attempt, regardless of outcome.
// Keeps a cryptographically-verified record of what Midtrans (and future
// providers) sent, whether we processed or rejected it, and why.
// =============================================================================

import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./_helpers";

export const webhookEventsTable = pgTable(
  "webhook_events",
  {
    id: primaryId(),

    // ── When ──────────────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // ── Provider identity ─────────────────────────────────────────────────────
    /** Payment/event provider (e.g. "midtrans") */
    provider: varchar("provider", { length: 30 }).notNull(),

    // ── Notification identity ─────────────────────────────────────────────────
    /**
     * Provider's unique notification ID used for idempotency deduplication.
     * Midtrans: transaction_id. Null when the field was absent (e.g. test pings).
     */
    transactionId: varchar("transaction_id", { length: 100 }),

    /**
     * The order/payment reference from the notification.
     * Midtrans: order_id.
     */
    orderId: varchar("order_id", { length: 150 }),

    /**
     * Payment status reported in the notification (settlement, pending, etc.).
     * Null when the body was invalid / signature check failed before parsing.
     */
    paymentStatus: varchar("payment_status", { length: 30 }),

    // ── Gateway outcome ───────────────────────────────────────────────────────
    /**
     * Result of gateway processing:
     *   forwarded         — signature OK, first delivery, passed to service
     *   duplicate         — already seen (Redis idempotency hit)
     *   invalid_signature — SHA512 mismatch
     *   invalid_json      — body could not be parsed as JSON
     *   sig_skipped       — MIDTRANS_SERVER_KEY not configured; forwarded anyway
     */
    outcome: varchar("outcome", { length: 30 }).notNull(),

    /** Human-readable reason when outcome is not 'forwarded' */
    outcomeDetail: text("outcome_detail"),

    // ── Network context ───────────────────────────────────────────────────────
    /** Caller IP address (v4 or v6) */
    ip: varchar("ip", { length: 45 }),

    // ── Payload ───────────────────────────────────────────────────────────────
    /**
     * Full raw notification body stored as JSONB.
     * Null when the body could not be parsed (invalid_json outcome).
     * NOTE: Midtrans notifications may contain PII (email, name).
     *       Apply column-level encryption or scrubbing before long-term archival.
     */
    rawPayload: jsonb("raw_payload"),
  },
  (t) => [
    index("webhook_events_created_at_idx").on(t.createdAt),
    index("webhook_events_provider_idx").on(t.provider),
    index("webhook_events_transaction_id_idx").on(t.transactionId),
    index("webhook_events_order_id_idx").on(t.orderId),
    index("webhook_events_outcome_idx").on(t.outcome),
    index("webhook_events_ip_idx").on(t.ip),
  ]
);

export type WebhookEventRow = typeof webhookEventsTable.$inferSelect;
export type NewWebhookEventRow = typeof webhookEventsTable.$inferInsert;
