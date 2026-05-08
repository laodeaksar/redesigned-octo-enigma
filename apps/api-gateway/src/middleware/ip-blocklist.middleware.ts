// =============================================================================
// IP Blocklist middleware
//
// Checks every incoming request against a Redis-backed blocklist.
// IPs are blocked automatically when they exceed the failure threshold
// (see audit.middleware.ts) and can also be managed manually via admin routes.
//
// Redis key schema:
//   ipbl:block:{ip}  — blocked entry, value = JSON { reason, blockedAt, until }
//   ipbl:fail:{ip}   — sliding failure counter, expires after WINDOW_SECONDS
//
// Configuration (env-overridable):
//   IP_BLOCK_THRESHOLD       — failures before auto-block     (default 10)
//   IP_BLOCK_WINDOW_SECONDS  — sliding window duration        (default 300 = 5 min)
//   IP_BLOCK_DURATION_SECONDS— how long the block lasts       (default 3600 = 1 hour)
// =============================================================================

import { failure } from "@repo/common/schemas";
import { createMiddleware } from "hono/factory";
import { getRedis } from "@/config";

export const BLOCK_KEY_PREFIX = "ipbl:block:";
export const FAIL_KEY_PREFIX = "ipbl:fail:";

export const IP_BLOCK_THRESHOLD = Number.parseInt(
  process.env.IP_BLOCK_THRESHOLD ?? "10",
  10
);
export const IP_BLOCK_WINDOW_SECONDS = Number.parseInt(
  process.env.IP_BLOCK_WINDOW_SECONDS ?? "300",
  10
);
export const IP_BLOCK_DURATION_SECONDS = Number.parseInt(
  process.env.IP_BLOCK_DURATION_SECONDS ?? "3600",
  10
);

export interface BlockEntry {
  autoBlock: boolean;
  blockedAt: string; // ISO timestamp
  reason: string;
  until: string; // ISO timestamp
}

/** Extract the best available client IP from a Hono request. */
export function extractIp(req: {
  header: (k: string) => string | undefined;
}): string {
  return (
    req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.header("x-real-ip") ??
    "unknown"
  );
}

/**
 * Early-pipeline middleware: rejects requests from blocked IPs with 403.
 * Degrades gracefully when Redis is unavailable.
 */
export const ipBlocklistMiddleware = createMiddleware(async (c, next) => {
  const redis = getRedis();
  if (!redis) {
    return next(); // Redis unavailable — pass through
  }

  const ip = extractIp(c.req);
  if (ip === "unknown") {
    return next(); // Can't block unknown IPs
  }

  const raw = await redis.get(`${BLOCK_KEY_PREFIX}${ip}`).catch(() => null);
  if (!raw) {
    return next(); // Not blocked
  }

  let entry: BlockEntry | null = null;
  try {
    entry = JSON.parse(raw) as BlockEntry;
  } catch {
    /* ignore */
  }

  return c.json(
    failure(
      "IP_BLOCKED",
      "Your IP address has been temporarily blocked due to repeated failed authentication attempts. " +
        `It will be automatically unblocked at ${entry?.until ?? "an unknown time"}.`
    ),
    403
  );
});

// =============================================================================
// Helper — called from auditMiddleware after a 401/403 is logged.
// Increments the failure counter for the IP and auto-blocks if threshold exceeded.
// =============================================================================

/**
 * Increment the rolling failure counter for an IP.
 * If it crosses IP_BLOCK_THRESHOLD, automatically add the IP to the blocklist.
 *
 * @returns the new failure count, or null when Redis is unavailable
 */
export async function recordIpFailure(ip: string): Promise<number | null> {
  if (ip === "unknown") {
    return null;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const failKey = `${FAIL_KEY_PREFIX}${ip}`;
  const blockKey = `${BLOCK_KEY_PREFIX}${ip}`;

  try {
    // Already blocked? Don't keep incrementing.
    const alreadyBlocked = await redis.exists(blockKey);
    if (alreadyBlocked) {
      return null;
    }

    // Atomic increment + set TTL on first write
    const count = await redis.incr(failKey);
    if (count === 1) {
      await redis.expire(failKey, IP_BLOCK_WINDOW_SECONDS);
    }

    if (count >= IP_BLOCK_THRESHOLD) {
      const now = new Date();
      const until = new Date(now.getTime() + IP_BLOCK_DURATION_SECONDS * 1000);

      const entry: BlockEntry = {
        reason: `Auto-blocked after ${count} failed auth attempts within ${IP_BLOCK_WINDOW_SECONDS}s`,
        blockedAt: now.toISOString(),
        until: until.toISOString(),
        autoBlock: true,
      };

      await redis.set(
        blockKey,
        JSON.stringify(entry),
        "EX",
        IP_BLOCK_DURATION_SECONDS
      );
      await redis.del(failKey); // Reset counter

      console.warn(
        `[ip-blocklist] AUTO-BLOCKED ${ip} until ${until.toISOString()} (${count} failures)`
      );
    }

    return count;
  } catch (err) {
    console.warn("[ip-blocklist] Redis error in recordIpFailure:", err);
    return null;
  }
}
