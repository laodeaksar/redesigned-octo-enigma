import { env } from "@/config";
import { SmtpProvider, ResendProvider } from "./providers";
import { emailPayloadSchema, EmailProvider, EmailPayload, SendResult } from "./schema";

// ── Provider instance ─────────────────────────────────────────────────────────

const provider: EmailProvider = env.RESEND_API_KEY ? new ResendProvider() : new SmtpProvider();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a transactional email.
 *
 * Validates the payload with Zod before dispatching.
 * Automatically selects Resend if `RESEND_API_KEY` is set, otherwise SMTP.
 *
 * @throws {z.ZodError} – if the payload fails validation
 * @throws {Error}      – if the provider returns an error
 */
export async function sendEmail(raw: EmailPayload): Promise<SendResult> {
  const payload = emailPayloadSchema.parse(raw);
  return provider.send(payload);
}

/**
 * Verify the active provider's connection.
 * Call once at startup to surface misconfiguration early.
 *
 * @throws {Error} – if the provider is unreachable or credentials are invalid
 */
export async function verifyMailer(): Promise<void> {
  return provider.verify();
}

export * from "./schema";

