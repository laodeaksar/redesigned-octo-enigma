import { z } from "zod";

const recipientSchema = z.union([
  z.email(),
  z.array(z.email()),
]);

export const emailPayloadSchema = z.object({
  to: recipientSchema,
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  cc: recipientSchema.optional(),
  bcc: recipientSchema.optional(),
  replyTo: recipientSchema.optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

// Otomatis mendapatkan tipe dari schema
export type EmailPayload = z.infer<typeof emailPayloadSchema>;

export type EmailProvider = "smtp" | "resend";

export interface SendResult {
  messageId: string;
  provider: EmailProvider;
}

export interface MailProvider {
  send(payload: EmailPayload): Promise<SendResult>;
  verify(): Promise<void>;
}

