// =============================================================================
// Base email handler factory — DRY wrapper untuk semua BullMQ email processor
// =============================================================================

import type { Processor, Job } from "@repo/common/events";
import type {
  EmailResult,
  EmailTemplate,
  EmailPayload,
} from "@repo/common/types";
import { z } from "zod";
import { redis } from "@/config";
import { sendEmail } from "@/lib/mailer";

export interface EmailHandlerResult {
  status: "sent" | "skipped";
  reason?: "rate_limited" | "expired" | "duplicate";
  to?: string;
  provider?: EmailResult["provider"];
  messageId?: string;
  sentAt?: string;
}

interface CreateEmailHandlerOpts<T extends { email: string }> {
  queueName: string;
  schema: z.ZodSchema<T>;
  getTemplate: (data: T) => EmailTemplate;
  rateLimitSec?: number;
  timeoutMs?: number;
  checkExpiry?: (data: T) => boolean;
  getExtraHeaders?: (data: T) => Record<string, string>;
}

export function createEmailHandler<T extends { email: string }>(
  opts: CreateEmailHandlerOpts<T>,
): Processor<T> {
  const {
    queueName,
    schema,
    getTemplate,
    rateLimitSec,
    timeoutMs = 10000,
    checkExpiry,
    getExtraHeaders,
  } = opts;

  return async (job: Job<T>): Promise<EmailHandlerResult> => {
    const jobId = job.id ?? "unknown";

    try {
      const data = schema.parse(job.data);

      if (checkExpiry?.(data)) {
        console.warn(
          `[${queueName}] Job ${jobId} skipped — expired for ${data.email}`,
        );
        return { status: "skipped", reason: "expired" };
      }

      if (rateLimitSec) {
        const key = `ratelimit:${queueName}:${data.email}`;
        if (await redis.get(key)) {
          console.warn(
            `[${queueName}] Job ${jobId} skipped — rate limited for ${data.email}`,
          );
          return { status: "skipped", reason: "rate_limited" };
        }
        await redis.setex(key, rateLimitSec, "1");
      }

      const template = getTemplate(data);
      const extraHeaders = getExtraHeaders?.(data);

      // Fix: Build EmailPayload tanpa field undefined
      const emailPayload: EmailPayload = {
        to: data.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      // Only assign headers kalau ada isinya, biar nggak jadi {}
      if (extraHeaders && Object.keys(extraHeaders).length > 0) {
        emailPayload.headers = extraHeaders;
      }

      const result: EmailResult = await Promise.race([
        sendEmail(emailPayload),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Email provider timeout after ${timeoutMs}ms`)),
            timeoutMs,
          ),
        ),
      ]);

      console.info(
        `[${queueName}] Job ${jobId} — sent to ${data.email} via ${result.provider} (${result.messageId})`,
      );

      return {
        status: "sent",
        to: data.email,
        provider: result.provider,
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      const email = (job.data as T)?.email ?? "unknown";
      console.error(
        `[${queueName}] Job ${jobId} failed for ${email}:`,
        err instanceof Error ? err.message : err,
      );

      if (err instanceof Error) {
        err.message = `[${queueName}] ${err.message}`;
      }

      throw err;
    }
  };
}
