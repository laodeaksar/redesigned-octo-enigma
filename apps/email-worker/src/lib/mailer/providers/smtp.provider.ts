import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

import { env } from "@/config";
import { SMTP_CONFIG } from "../constants";
import type { EmailPayload, SendResult, MailProvider } from "../schemas";
import { formatSender, resolveReplyTo } from "../utils";

export class SmtpProvider implements MailProvider {
  private transport: Transporter | null = null;

  private getTransport(): Transporter {
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        ...SMTP_CONFIG,
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      });
    }

    return this.transport;
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    const message: SendMailOptions = {
      from: formatSender(),
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: resolveReplyTo(payload),
      headers: payload.headers,
    };

    const info = await this.getTransport().sendMail(message);

    return { messageId: info.messageId, provider: "smtp" };
  }

  async verify(): Promise<void> {
    await this.getTransport().verify();
    console.info(`[Mailer] SMTP connected → ${env.SMTP_HOST}:${env.SMTP_PORT} ✓`);
  }
}
