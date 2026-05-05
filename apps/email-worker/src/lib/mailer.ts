// =============================================================================
// Mailer — transport factory supporting SMTP (nodemailer) and Resend HTTP API
//
// Priority:
// 1. RESEND_API_KEY set → use Resend SDK (recommended for production)
// 2. Otherwise → use nodemailer SMTP
//
// Both paths expose the same `sendEmail()` interface.
// =============================================================================

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import { env } from "@/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  headers?: Record<string, string>; // Fix 1: tambah support headers
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendResult {
  messageId: string;
  provider: "smtp" | "resend";
}

// ── SMTP transport (nodemailer) ───────────────────────────────────────────────

let _smtpTransport: Transporter | null = null;

function getSmtpTransport(): Transporter {
  if (_smtpTransport) return _smtpTransport;

  _smtpTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  return _smtpTransport;
}

async function sendViaSMTP(payload: EmailPayload): Promise<SendResult> {
  const transport = getSmtpTransport();

  const message: SendMailOptions = {
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
    to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo ?? env.EMAIL_REPLY_TO ?? undefined, // Fix 3: handle undefined
    headers: payload.headers, // Fix 1: forward headers
    cc: payload.cc,
    bcc: payload.bcc,
  };

  const info = await transport.sendMail(message);

  return {
    messageId: info.messageId,
    provider: "smtp",
  };
}

// ── Resend HTTP API ───────────────────────────────────────────────────────────

let _resendClient: import("resend").Resend | null = null;

async function getResendClient() {
  if (_resendClient) return _resendClient;
  const { Resend } = await import("resend");
  _resendClient = new Resend(env.RESEND_API_KEY);
  return _resendClient;
}

// ── Resend HTTP API ───────────────────────────────────────────────────────────

async function sendViaResend(payload: EmailPayload): Promise<SendResult> {
  const client = await getResendClient();

  // Fix: Filter undefined/empty values biar sesuai CreateEmailOptions
  const resendPayload: import("resend").CreateEmailOptions = {
    from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
  };

  // Only add optional fields kalau ada nilainya
  if (payload.text) resendPayload.text = payload.text;
  if (payload.cc) resendPayload.cc = payload.cc;
  if (payload.bcc) resendPayload.bcc = payload.bcc;

  const replyTo = payload.replyTo ?? env.EMAIL_REPLY_TO;
  if (replyTo) resendPayload.reply_to = replyTo; // Fix: jangan kirim '' atau undefined

  if (payload.headers && Object.keys(payload.headers).length > 0) {
    resendPayload.headers = payload.headers; // Fix: jangan kirim {}
  }

  const { data, error } = await client.emails.send(resendPayload);

  if (error) {
    throw new Error(`Resend API error: ${error.message} [${error.name}]`);
  }
  if (!data?.id) {
    throw new Error("Resend API error: No message ID returned");
  }

  return {
    messageId: data.id,
    provider: "resend",
  };
}

// ── Unified send ──────────────────────────────────────────────────────────────

/**
 * Send a transactional email using the configured provider.
 * Automatically chooses Resend if RESEND_API_KEY is set, otherwise SMTP.
 */
export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (env.RESEND_API_KEY) {
    return sendViaResend(payload);
  }
  return sendViaSMTP(payload);
}

/**
 * Verify the email provider connection during startup.
 */
export async function verifyMailer(): Promise<void> {
  if (env.RESEND_API_KEY) {
    // Fix 4: Verify Resend API key valid
    try {
      const client = await getResendClient();
      await client.domains.list(); // call ringan buat test auth
      console.info("[Mailer] Using Resend HTTP API — authenticated");
    } catch (err) {
      throw new Error(
        `[Mailer] Resend auth failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    return;
  }

  const transport = getSmtpTransport();
  await transport.verify();
  console.info(`[Mailer] SMTP connected → ${env.SMTP_HOST}:${env.SMTP_PORT}`);
}
