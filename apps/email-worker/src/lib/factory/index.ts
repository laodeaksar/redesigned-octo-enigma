import { redis } from "@/config";
import type { z } from "zod";

import type { Job, Processor } from "@repo/common/events";
import type { EmailPayload, EmailResult, EmailTemplate } from "@repo/common/types";

import { sendEmail } from "@/lib/mailer";
import { withJobLogger } from "@/lib/logger-wrapper";
import { withTimeout } from "./timeout";
import { recordFailure, recordSuccess } from "./metrics";
import type { EmailHandlerResult, CreateEmailHandlerOpts } from "./types";

export type { EmailHandlerResult, CreateEmailHandlerOpts };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function checkRateLimit(
  email: string,
  queueName: string,
  ttlSec: number
): Promise<boolean> {
  const key = `ratelimit:${queueName}:${email}`;
  if (await redis.get(key)) return true;
  await redis.setex(key, ttlSec, "1");
  return false;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEmailHandler<T extends { email: string }>(
  opts: CreateEmailHandlerOpts<T>
): Processor<T> {
  const { queueName, schema, getPayload, rateLimitSec, timeoutMs = 10_000, checkExpiry } = opts;

  async function processor(job: Job<T>): Promise<EmailHandlerResult> {
    const data = schema.parse(job.data);
    const payload = getPayload(data)

    // ── Expiry check ─────────────────────────────────────────────────────────
    if (checkExpiry?.(data)) {
      return { status: "skipped", reason: "expired" };
    }

    // ── Rate limit check ─────────────────────────────────────────────────────
    if (rateLimitSec && await checkRateLimit(data.email, queueName, rateLimitSec)) {
      return { status: "skipped", reason: "rate_limited" };
    }

    // ── Build & send ─────────────────────────────────────────────────────────
    const startMs = Date.now();
    const result: EmailResult = await withTimeout(
      sendEmail(payload),
      timeoutMs
    );
    const durationSec = (Date.now() - startMs) / 1000;

    recordSuccess({ queueName, provider: result.provider, durationSec });

    return {
      status: "sent",
      to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
      provider: result.provider,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    };
  }

  return withJobLogger(queueName, async (job) => {
    try {
      return await processor(job as Job<T>);
    } catch (err) {
      recordFailure({ queueName });
      throw err;
    }
  });
}
