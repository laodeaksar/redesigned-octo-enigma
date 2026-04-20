// =============================================================================
// Mailer — transport factory supporting SMTP (nodemailer) and Resend HTTP API
//
// Priority:
//   1. RESEND_API_KEY set → use Resend SDK (recommended for production)
//   2. Otherwise           → use nodemailer SMTP
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
  replyTo?: string;
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
    // Connection pool for better throughput
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Retry failed sends
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
    replyTo: payload.replyTo ?? env.EMAIL_REPLY_TO,
  };

  const info = await transport.sendMail(message);

  return {
    messageId: info.messageId,
    provider: "smtp",
  };
}

// ── Resend HTTP API ───────────────────────────────────────────────────────────

async function sendViaResend(payload: EmailPayload): Promise<SendResult> {
  const { Resend } = await import("resend");
  const client = new Resend(env.RESEND_API_KEY);

  const { data, error } = await client.emails.send({
    from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    reply_to: payload.replyTo ?? env.EMAIL_REPLY_TO,
  });

  if (error ?? !data) {
    throw new Error(`Resend API error: ${error?.message ?? "Unknown error"}`);
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
 * Verify the SMTP connection during startup.
 * No-op when using Resend.
 */
export async function verifyMailer(): Promise<void> {
  if (env.RESEND_API_KEY) {
    console.info("[Mailer] Using Resend HTTP API");
    return;
  }

  const transport = getSmtpTransport();
  await transport.verify();
  console.info(
    `[Mailer] SMTP connected → ${env.SMTP_HOST}:${env.SMTP_PORT}`
  );
}

