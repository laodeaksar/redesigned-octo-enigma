// =============================================================================
// Email types — shared across mailer, templates, handlers
// =============================================================================

export interface EmailPayload {
  attachments?: EmailAttachment[];
  bcc?: string | string[];
  cc?: string | string[];
  headers?: Record<string, string>;
  html: string;
  replyTo?: string;
  subject: string;
  text?: string;
  to: string | string[];
}

export interface EmailAttachment {
  cid?: string; // buat inline images
  content: Buffer | string;
  contentType?: string;
  filename: string;
}

export interface EmailResult {
  accepted?: string[]; // SMTP: email yang sukses
  messageId: string;
  provider: "smtp" | "resend";
  rejected?: string[]; // SMTP: email yang ditolak
  response?: string; // SMTP response code
}

export interface EmailTemplate {
  html: string;
  subject: string;
  text: string;
}
