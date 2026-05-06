// =============================================================================
// Email types — shared across mailer, templates, handlers
// =============================================================================

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  cid?: string; // buat inline images
}

export interface EmailResult {
  messageId: string;
  provider: "smtp" | "resend";
  accepted?: string[]; // SMTP: email yang sukses
  rejected?: string[]; // SMTP: email yang ditolak
  response?: string; // SMTP response code
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}
