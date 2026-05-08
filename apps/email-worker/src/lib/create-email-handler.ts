// =============================================================================
// Base email handler factory — DRY wrapper untuk semua BullMQ email processor
// =============================================================================

import type { Job, Processor } from "@repo/common/events";
import type {
  EmailPayload,
  EmailResult,
  EmailTemplate,
} from "@repo/common/types";
import type { z } from "zod";
import { redis } from "@/config";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";
import { emailSendDuration, emailsFailed, emailsSent } from "@/metrics";

export interface EmailHandlerResult {
  messageId?: string;
  provider?: EmailResult["provider"];
  reason?: "rate_limited" | "expired" | "duplicate";
  sentAt?: string;
  status: "sent" | "skipped";
  to?: string;
}

interface CreateEmailHandlerOpts<T extends { email: string }> {
  checkExpiry?: (data: T) => boolean;
  getExtraHeaders?: (data: T) => Record<string, string>;
  getTemplate: (data: T) => EmailTemplate;
  queueName: string;
  rateLimitSec?: number;
  schema: z.ZodSchema<T>;
  timeoutMs?: number;
}

export function createEmailHandler<T extends { email: string }>(
  opts: CreateEmailHandlerOpts<T>
): Processor<T> {
  const {
    queueName,
    schema,
    getTemplate,
    rateLimitSec,
    timeoutMs = 10_000,
    checkExpiry,
    getExtraHeaders,
  } = opts;

  return async (job: Job<T>): Promise<EmailHandlerResult> => {
    const jobId = job.id ?? "unknown";
    const jobLogger = logger.child({
      jobId,
      queueName,
      attempt: job.attemptsMade + 1,
    });

    jobLogger.info("Processing job");
    const startMs = Date.now();

    try {
      const data = schema.parse(job.data);

      // ── Expiry check ───────────────────────────────────────────────────────
      if (checkExpiry?.(data)) {
        jobLogger.warn({ email: data.email }, "Job skipped — expired");
        return { status: "skipped", reason: "expired" };
      }

      // ── Rate limiting (per email address, per queue) ───────────────────────
      if (rateLimitSec) {
        const key = `ratelimit:${queueName}:${data.email}`;
        if (await redis.get(key)) {
          jobLogger.warn({ email: data.email }, "Job skipped — rate limited");
          return { status: "skipped", reason: "rate_limited" };
        }
        await redis.setex(key, rateLimitSec, "1");
      }

      // ── Build & send ───────────────────────────────────────────────────────
      const template = getTemplate(data);
      const extraHeaders = getExtraHeaders?.(data);

      const emailPayload: EmailPayload = {
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };
      if (extraHeaders && Object.keys(extraHeaders).length > 0) {
        emailPayload.headers = extraHeaders;
      }

      const result: EmailResult = await Promise.race([
        sendEmail(emailPayload),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Email provider timeout after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

      const durationSec = (Date.now() - startMs) / 1000;

      // ── Metrics ────────────────────────────────────────────────────────────
      emailsSent.inc({ type: queueName, provider: result.provider });
      emailSendDuration.observe(
        { type: queueName, provider: result.provider },
        durationSec
      );

      jobLogger.info(
        {
          email: data.email,
          provider: result.provider,
          messageId: result.messageId,
          durationSec,
        },
        "Job completed — email sent"
      );

      return {
        status: "sent",
        to: data.email,
        provider: result.provider,
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      const durationSec = (Date.now() - startMs) / 1000;
      const email = (job.data as T)?.email ?? "unknown";

      emailsFailed.inc({ type: queueName });

      jobLogger.error({ err, email, durationSec }, "Job failed");

      // Prefix error message so BullMQ dashboard shows queue context
      if (err instanceof Error) {
        err.message = `[${queueName}] ${err.message}`;
      }

      throw err; // Re-throw so BullMQ handles retry/backoff
    }
  };
}
