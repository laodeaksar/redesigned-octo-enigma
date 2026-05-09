/*import { z } from "zod";
import type { Job } from "@repo/common/events";

import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/mailer";
import { withJobLogger } from "@/lib/logger-wrapper";
import {
  withTimeout,
  recordFailure, 
  recordSuccess,
  EmailHandlerResult
} from "@/lib/factory";

// ── Constants ─────────────────────────────────────────────────────────────────

const QUEUE_NAME = "email.security-alert";
const TIMEOUT_MS = 15_000;

// ── Schema ────────────────────────────────────────────────────────────────────

const SecurityAlertSchema = z.object({
  to: z.union([z.email(), z.array(z.email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
});

type SecurityAlertData = z.infer<typeof SecurityAlertSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTo(to: SecurityAlertData["to"]): string {
  return Array.isArray(to) ? to.join(", ") : to;
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function processor(job: Job<SecurityAlertData>): Promise<EmailHandlerResult> {
  const data = SecurityAlertSchema.parse(job.data);
  const startMs = Date.now();

  const result = await withTimeout(sendEmail(data), TIMEOUT_MS);
  const durationSec = (Date.now() - startMs) / 1000;

  recordSuccess({ queueName: QUEUE_NAME, provider: result.provider, durationSec });

  logger.info(
    { to: formatTo(data.to), provider: result.provider, messageId: result.messageId, durationSec },
    "Security alert email sent"
  );

  return {
    status: "sent",
    to: formatTo(data.to),
    provider: result.provider,
    messageId: result.messageId,
    sentAt: new Date().toISOString(),
  };
}

export const handleSecurityAlertEmail = withJobLogger(QUEUE_NAME, async (job) => {
  try {
    return await processor(job as Job<SecurityAlertData>);
  } catch (err) {
    recordFailure({ queueName: QUEUE_NAME });

    throw err;
  }
});*/

// =============================================================================
// Security alert email handler
// Queue: email.security-alert
// =============================================================================

import { z } from "zod";
import { createEmailHandler } from "@/lib/factory";

const schema = z.object({
  to:      z.union([z.email(), z.array(z.email())]),
  subject: z.string().min(1),
  html:    z.string().min(1),
  text:    z.string().optional(),
}).transform((data) => ({
  ...data,
  // `email` is required by createEmailHandler for rate-limit keying.
  // For multi-recipient alerts, use the first address as the canonical key.
  email: Array.isArray(data.to) ? data.to[0]! : data.to,
}));

export const handleSecurityAlertEmail = createEmailHandler({
  queueName: "email.security-alert",
  schema,
  getPayload: (data) => ({
    to:      data.to,
    subject: data.subject,
    html:    data.html,
    text:    data.text,
  }),
  timeoutMs: 15_000,
  // No rateLimitSec  – security alerts must always be delivered.
  // No checkExpiry   – security alerts are always time-critical.
});
