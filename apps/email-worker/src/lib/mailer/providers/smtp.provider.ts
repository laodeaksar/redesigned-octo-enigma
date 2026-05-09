/**
 * ⚠️  PERHATIAN RUNTIME COMPATIBILITY:
 *
 * SmtpProvider menggunakan `nodemailer` yang bergantung pada Node.js built-ins
 * (net, tls, dns). Provider ini HANYA kompatibel dengan runtime Node.js.
 *
 * Jika Anda menjalankan di Cloudflare Workers / Edge Runtime:
 *   → Gunakan ResendProvider (set RESEND_API_KEY), atau
 *   → Ganti dengan MailChannelsProvider yang menggunakan fetch() API
 *
 * Lihat: https://developers.cloudflare.com/pages/functions/plugins/mailchannels/
 */

import nodemailer, { type SendMailOptions, type Transporter, type SentMessageInfo } from "nodemailer";

import { env } from "@/config";
import { SMTP_CONFIG } from "../constants";
import type { EmailPayload, SendResult } from "../schemas";
import { formatSender, resolveReplyTo } from "../utils";
import { BaseProvider } from "./base.provider";

export class SmtpProvider extends BaseProvider {
  protected readonly providerName = "SMTP";

  private transport: Transporter | null = null;

  // ── Transport initialization ─────────────────────────────────────────────────

  private getTransport(): Transporter {
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        ...SMTP_CONFIG,
        host:   env.SMTP_HOST,
        port:   env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      });
    }
    return this.transport;
  }

  // ── MailProvider implementation ──────────────────────────────────────────────

  protected async _send(payload: EmailPayload): Promise<SendResult> {
    const message: SendMailOptions = {
      // Gunakan `from` override dari payload jika ada, fallback ke env
      from:    payload.from ?? formatSender(),
      // recipientSchema sudah normalisasi ke string[] — join untuk nodemailer
      to:      payload.to.join(", "),
      subject: payload.subject,
      html:    payload.html,
      ...(payload.text        && { text:    payload.text }),
      ...(payload.cc          && { cc:      payload.cc }),
      ...(payload.bcc         && { bcc:     payload.bcc }),
      ...(resolveReplyTo(payload) && { replyTo: resolveReplyTo(payload) }),
      ...(payload.headers     && { headers: payload.headers }),
      ...(payload.attachments && {
        attachments: payload.attachments.map((a) => ({
          filename:    a.filename,
          content:     a.content,
          contentType: a.contentType,
          cid:         a.cid,
        })),
      }),
    };

    let info: SentMessageInfo;
    try {
      info = await this.getTransport().sendMail(message);
    } catch (err) {
      // Error asli nodemailer bisa expose kredensial — wrap dengan pesan yang aman
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[SMTP] sendMail failed: ${reason}`);
    }

    if (!info.messageId) {
      throw new Error("[SMTP] sendMail succeeded but returned no messageId");
    }

    return { messageId: info.messageId, provider: "smtp" };
  }

  protected async _verify(): Promise<void> {
    // nodemailer.verify() membuka koneksi TCP ke server — pastikan ada timeout
    // (dihandle oleh BaseProvider.verify())
    await this.getTransport().verify();
    // Log host:port untuk mempermudah debugging
    console.info(`[Mailer] SMTP → ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  }
}

