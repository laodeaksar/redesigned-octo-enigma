// =============================================================================
// Midtrans webhook IP allowlist middleware
//
// Provides a hard outer wall for POST /payments/webhook: any request whose
// source IP is not within a known Midtrans CIDR range is rejected before it
// consumes any rate-limit budget, performs any crypto, or writes to the DB.
//
// ── Pre-seeded ranges (Midtrans official docs — last verified 2025) ───────────
//   202.152.187.0/24  — Midtrans production notification range
//   103.208.23.0/24   — Midtrans newer production range
//   127.0.0.1/32      — loopback (local dev / integration tests)
//   ::1/128           — IPv6 loopback
//
// ── Configuration (env vars) ─────────────────────────────────────────────────
//   MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED
//     "true"  → enforcement on  (default)
//     "false" → enforcement off (fail open — for local dev without real Midtrans)
//
//   MIDTRANS_WEBHOOK_EXTRA_CIDR
//     Comma-separated list of additional CIDR ranges to allow alongside the
//     built-in list (e.g. Midtrans sandbox IPs, your staging proxy's egress IP).
//     Example: "1.2.3.0/24,10.0.0.5/32"
//
// ── Response on block ────────────────────────────────────────────────────────
//   HTTP 200 with { success: false, error: { code: "WEBHOOK_IP_NOT_ALLOWED" } }
//
//   Returning 200 (not 403) intentionally mirrors the pattern in the signature-
//   verification middleware: Midtrans (and most payment providers) retry any
//   non-2xx response indefinitely.  A 200 silently drops the request from the
//   provider's perspective while still giving us a loggable event.
// =============================================================================

import { db } from "@/config";
import { createMiddleware } from "hono/factory";

import { webhookEventsTable } from "@repo/database/drizzle/schema";

import { logger } from "@/lib/logger";

// ── CIDR helpers (IPv4-only — Midtrans uses IPv4) ────────────────────────────

interface CidrRange {
  base: number; // 32-bit network address (masked)
  mask: number; // 32-bit mask
  raw: string; // original string, for log messages
}

function parseIpv4(ip: string): number | null {
  // Strip IPv4-mapped IPv6 prefix
  const stripped = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const parts = stripped.split(".");
  if (parts.length !== 4) {
    return null;
  }
  let n = 0;
  for (const p of parts) {
    const byte = Number.parseInt(p, 10);
    if (isNaN(byte) || byte < 0 || byte > 255) {
      return null;
    }
    n = (n << 8) | byte;
  }
  // Treat as unsigned 32-bit
  return n >>> 0;
}

function parseCidr(cidr: string): CidrRange | null {
  const [ip, bitsStr] = cidr.split("/");
  if (!(ip && bitsStr)) {
    return null;
  }
  const prefix = Number.parseInt(bitsStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }

  const addr = parseIpv4(ip);
  if (addr === null) {
    return null;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return { base: (addr & mask) >>> 0, mask, raw: cidr };
}

function isIpv4InRange(ip: string, range: CidrRange): boolean {
  const addr = parseIpv4(ip);
  if (addr === null) {
    return false;
  }
  return (addr & range.mask) >>> 0 === range.base;
}

// ── Loopback (exact-match, handles IPv6 forms) ───────────────────────────────

const LOOPBACK_EXACT = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "localhost",
]);

function isLoopback(ip: string): boolean {
  if (LOOPBACK_EXACT.has(ip)) {
    return true;
  }
  // 127.x.x.x range
  const addr = parseIpv4(ip);
  return addr !== null && addr >>> 24 === 127;
}

// ── Allowlist configuration ───────────────────────────────────────────────────

/**
 * Midtrans official production notification IP ranges.
 * Source: https://docs.midtrans.com/reference/ip-addresses
 * Update this list if Midtrans announces new ranges.
 */
const MIDTRANS_BUILT_IN_CIDRS: string[] = [
  "202.152.187.0/24", // Midtrans production (primary)
  "103.208.23.0/24", // Midtrans production (newer)
];

function buildAllowlist(): CidrRange[] {
  const rawList = [...MIDTRANS_BUILT_IN_CIDRS];

  const extra = process.env["MIDTRANS_WEBHOOK_EXTRA_CIDR"];
  if (extra) {
    for (const entry of extra.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) {
        rawList.push(trimmed);
      }
    }
  }

  const parsed: CidrRange[] = [];
  for (const cidr of rawList) {
    const range = parseCidr(cidr);
    if (range) {
      parsed.push(range);
    } else {
      logger.warn("[webhook-allowlist] Invalid CIDR entry — skipped", { cidr });
    }
  }
  return parsed;
}

// Parse once at startup — CIDR math is cheap but no need to repeat per request
const ALLOWLIST: CidrRange[] = buildAllowlist();

const ENABLED: boolean =
  (
    process.env["MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED"] ?? "true"
  ).toLowerCase() !== "false";

// Log effective configuration once at startup
if (ENABLED) {
  logger.info("[webhook-allowlist] Enforcement ON", {
    ranges: ALLOWLIST.map(r => r.raw),
    note: "Set MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED=false to disable (dev/test only)",
  });
} else {
  logger.warn(
    "[webhook-allowlist] Enforcement OFF — MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED=false",
    { note: "All IPs accepted. Do not use this setting in production." }
  );
}

// ── IP extraction (same header priority as rate-limit middleware) ─────────────

function extractIp(c: {
  req: { header: (k: string) => string | undefined };
}): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-real-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Rejects POST /payments/webhook calls whose source IP is not within a known
 * Midtrans range.  Must be placed FIRST in the webhook middleware chain.
 *
 * Gracefully disabled when MIDTRANS_WEBHOOK_ALLOWLIST_ENABLED=false.
 */
export const midtransAllowlistMiddleware = createMiddleware(async (c, next) => {
  if (!ENABLED) {
    return next();
  }

  const ip = extractIp(c);

  // If the IP cannot be determined (no forwarding headers, direct socket
  // connection in dev), fail open — mirrors ipBlocklistMiddleware convention.
  if (ip === "unknown") {
    return next();
  }

  // Loopback always passes — covers local dev and integration-test runners.
  if (isLoopback(ip)) {
    return next();
  }

  const allowed = ALLOWLIST.some(range => isIpv4InRange(ip, range));

  if (allowed) {
    logger.debug("[webhook-allowlist] IP allowed", { ip });
    return next();
  }

  logger.warn("[webhook-allowlist] Blocked non-Midtrans IP", {
    ip,
    path: c.req.path,
    hint: "Add to MIDTRANS_WEBHOOK_EXTRA_CIDR if this is a legitimate sender",
  });

  // Write to webhook_events so blocked deliveries appear in the audit log
  // alongside forwarded/duplicate/signature-invalid events.
  // Fire-and-forget — never delays the response.
  if (db) {
    db.insert(webhookEventsTable)
      .values({
        provider: "midtrans",
        ip,
        outcome: "not_allowed",
        outcomeDetail:
          "Source IP is not within any configured Midtrans CIDR range",
      })
      .catch((err: unknown) => {
        logger.warn("[webhook-allowlist] Failed to write audit row", { err });
      });
  }

  // Return 200 so the provider does not retry — same convention as the
  // signature verifier (Midtrans retries any non-2xx indefinitely).
  return c.json(
    {
      success: false,
      error: {
        code: "WEBHOOK_IP_NOT_ALLOWED",
        message: "Webhook source IP is not in the Midtrans allowlist",
      },
    },
    200
  );
});
