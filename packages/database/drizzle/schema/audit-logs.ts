// =============================================================================
// Audit Logs — security event log for failed auth/authz attempts
// Managed by: api-gateway
// =============================================================================

import {
  pgTable,
  text,
  timestamp,
  varchar,
  smallint,
  index,
} from "drizzle-orm/pg-core";

import { primaryId } from "./_helpers";

export const auditLogsTable = pgTable(
  "audit_logs",
  {
    id: primaryId(),

    // ── When ────────────────────────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // ── Request context ──────────────────────────────────────────────────────
    /** Client IP (v4 or v6 — max 45 chars) */
    ip: varchar("ip", { length: 45 }),
    method: varchar("method", { length: 10 }).notNull(),
    path: text("path").notNull(),
    userAgent: text("user_agent"),

    // ── Failure detail ───────────────────────────────────────────────────────
    /** HTTP status code (401, 403) */
    statusCode: smallint("status_code").notNull(),
    /** Machine-readable error code from the response (e.g. UNAUTHORIZED, FORBIDDEN) */
    errorCode: varchar("error_code", { length: 60 }).notNull(),

    // ── User context (if JWT was present / partially decoded) ─────────────────
    userId: varchar("user_id", { length: 36 }),
    userEmail: varchar("user_email", { length: 255 }),
    userRole: varchar("user_role", { length: 20 }),
  },
  (t) => [
    index("audit_logs_created_at_idx").on(t.createdAt),
    index("audit_logs_ip_idx").on(t.ip),
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_status_code_idx").on(t.statusCode),
    index("audit_logs_error_code_idx").on(t.errorCode),
  ]
);

export type AuditLogRow = typeof auditLogsTable.$inferSelect;
export type NewAuditLogRow = typeof auditLogsTable.$inferInsert;
