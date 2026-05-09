import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SUBJECT_LEN = 998;           // RFC 5321 limit
const MAX_BODY_BYTES  = 10 * 1024 * 1024; // 10 MB

// ── Sub-schemas ───────────────────────────────────────────────────────────────

/**
 * Selalu dinormalisasi ke string[] agar provider tidak perlu cek Array.isArray()
 */
const recipientSchema = z
  .union([z.email(), z.array(z.email()).min(1)])
  .transform((v) => (Array.isArray(v) ? v : [v]));

const attachmentSchema = z.object({
  filename:    z.string().min(1),
  content:     z.union([z.string(), z.instanceof(Uint8Array)]),
  contentType: z.string().optional(),
  cid:         z.string().optional(), // content-id untuk inline images
});

// ── Main Schema ───────────────────────────────────────────────────────────────

export const emailPayloadSchema = z.object({
  to:          recipientSchema,
  subject:     z.string().min(1).max(MAX_SUBJECT_LEN),
  html:        z.string().min(1).max(MAX_BODY_BYTES),
  text:        z.string().max(MAX_BODY_BYTES).optional(),
  from:        z.email().optional(),           // override sender (opsional)
  cc:          recipientSchema.optional(),
  bcc:         recipientSchema.optional(),
  replyTo:     recipientSchema.optional(),
  headers:     z.record(z.string(), z.string()).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

// ── Derived Types ─────────────────────────────────────────────────────────────

export type EmailPayload  = z.infer<typeof emailPayloadSchema>;
export type Attachment    = z.infer<typeof attachmentSchema>;

/**
 * String union yang mengidentifikasi provider mana yang mengirim email.
 * BUKAN interface provider — gunakan `MailProvider` untuk itu.
 */
export type EmailProviderName = "mailchannels" | "resend";

export interface SendResult {
  messageId: string;
  provider:  EmailProviderName;
}

/**
 * Interface yang harus diimplementasi oleh semua provider email.
 * Sebelumnya bernama MailProvider, kini lebih eksplisit.
 */
export interface MailProvider {
  send(payload: EmailPayload): Promise<SendResult>;
  verify(): Promise<void>;
}

