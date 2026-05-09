import type { CreateEmailOptions, Resend } from "resend";
import { env } from "@/config";
import { EmailPayload, MailProvider, SendResult } from "../schemas";
import { formatSender, resolveReplyTo } from "../utils";

export class ResendProvider implements MailProvider {

  private client: Resend | null = null;

  private async getClient(): Promise<Resend> {
    if (!this.client) {
      const { Resend } = await import("resend");
      this.client = new Resend(env.RESEND_API_KEY);
    }

    return this.client;
  }

  private buildPayload(payload: EmailPayload): CreateEmailOptions {
    const replyTo = resolveReplyTo(payload);
    const hasHeaders = payload.headers && Object.keys(payload.headers).length > 0;

    return {
      from: formatSender(),
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.text && { text: payload.text }),
      ...(payload.cc && { cc: payload.cc }),
      ...(payload.bcc && { bcc: payload.bcc }),
      ...(replyTo && { reply_to: replyTo }),
      ...(hasHeaders && { headers: payload.headers }),
    };
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    const client = await this.getClient();
    const { data, error } = await client.emails.send(this.buildPayload(payload));

    if (error) {
      throw new Error(`[Resend] ${error.name}: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("[Resend] Send succeeded but no message ID was returned");
    }

    return { messageId: data.id, provider: "resend" };
  }

  async verify(): Promise<void> {
    try {
      const client = await this.getClient();
      await client.domains.list();
      console.info("[Mailer] Resend — authenticated ✓");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[Mailer] Resend auth failed: ${reason}`);
    }
  }
}

