// =============================================================================
// Security alert email handler
// Queue: email.security-alert
//
// Job payload:
//   { to: string | string[], subject: string, html: string, text?: string }
//
// Uses a raw BullMQ processor (not createEmailHandler) because the recipient
// field is `to` (array-capable) rather than a single `email` string.
// The rich HTML/text body is pre-built by api-gateway/src/lib/alerting.ts.
// =============================================================================

import { emailSendDuration, emailsFailed, emailsSent } from "@/metrics";
import type { Job } from "bullmq";
import { z } from "zod";

import type { EmailHandlerResult } from "@/lib/create-email-handler";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";

const QUEUE_NAME = "email.security-alert";

const schema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
});

type SecurityAlertJobData = z.infer<typeof schema>;

export async function handleSecurityAlertEmail(
  job: Job<SecurityAlertJobData>
): Promise<EmailHandlerResult> {
  const jobId = job.id ?? "unknown";
  const jobLogger = logger.child({
    jobId,
    queueName: QUEUE_NAME,
    attempt: job.attemptsMade + 1,
  });

  jobLogger.info("Processing security alert email");
  const startMs = Date.now();

  try {
    const data = schema.parse(job.data);

    const result = await Promise.race([
      sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Email provider timeout after 15000ms")),
          15_000
        )
      ),
    ]);

    const durationSec = (Date.now() - startMs) / 1000;

    emailsSent.inc({ type: QUEUE_NAME, provider: result.provider });
    emailSendDuration.observe(
      { type: QUEUE_NAME, provider: result.provider },
      durationSec
    );

    const toStr = Array.isArray(data.to) ? data.to.join(", ") : data.to;
    jobLogger.info(
      { to: toStr, provider: result.provider, durationSec },
      "Security alert email sent"
    );

    return {
      status: "sent",
      to: toStr,
      provider: result.provider,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    const durationSec = (Date.now() - startMs) / 1000;

    emailsFailed.inc({ type: QUEUE_NAME });
    jobLogger.error({ err, durationSec }, "Security alert email failed");

    if (err instanceof Error) {
      err.message = `[${QUEUE_NAME}] ${err.message}`;
    }

    throw err;
  }
}
