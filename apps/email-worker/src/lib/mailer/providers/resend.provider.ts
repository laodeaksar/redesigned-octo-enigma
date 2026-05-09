import type { CreateEmailOptions, Resend } from "resend";
import { env } from "@/config";
import type { EmailPayload, SendResult } from "../schemas";
import { formatSender, resolveReplyTo } from "../utils";
import { BaseProvider } from "../base.provider";

export class ResendProvider extends BaseProvider {
  protected readonly providerName = "Resend";

  private client: Resend | null = null;

  // ── Lazy client initialization ──────────────────────────────────────────────

  private async getClient(): Promise<Resend> {
    if (!this.client) {
      const { Resend } = await import("resend");
      this.client = new Resend(env.RESEND_API_KEY);
    }
    return this.client;
  }

  // ── Payload builder ─────────────────────────────────────────────────────────

  private buildPayload(payload: EmailPayload): CreateEmailOptions {
    const replyTo   = resolveReplyTo(payload);
    const hasHeaders = payload.headers && Object.keys(payload.headers).length > 0;

    return {
      // Gunakan `from` override dari payload jika ada, fallback ke env
      from:    payload.from ?? formatSender(),
      // recipientSchema sudah normalisasi ke string[] — tidak perlu Array.isArray()
      to:      payload.to,
      subject: payload.subject,
      html:    payload.html,
      ...(payload.text        && { text:        payload.text }),
      ...(payload.cc          && { cc:          payload.cc }),
      ...(payload.bcc         && { bcc:         payload.bcc }),
      ...(replyTo             && { reply_to:    replyTo }),
      ...(hasHeaders          && { headers:     payload.headers }),
      ...(payload.attachments && { attachments: payload.attachments }),
    };
  }

  // ── MailProvider implementation ─────────────────────────────────────────────

  protected async _send(payload: EmailPayload): Promise<SendResult> {
    const client = await this.getClient();
    const { data, error } = await client.emails.send(this.buildPayload(payload));

    if (error) {
      // Error sudah ada nama provider dari BaseProvider.send() — tambahkan detail saja
      throw new Error(`[Resend] ${error.name}: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("[Resend] Send succeeded but no message ID was returned");
    }

    return { messageId: data.id, provider: "resend" };
  }

  protected async _verify(): Promise<void> {
    // Hindari API call yang memakan quota — validasi format key saja
    // Format Resend API key selalu diawali "re_"
    if (!env.RESEND_API_KEY?.startsWith("re_")) {
      throw new Error(
        "RESEND_API_KEY format invalid — expected key starting with 're_'"
      );
    }
    // Jika ingin verifikasi live (lebih akurat tapi lebih mahal):
    // const client = await this.getClient();
    // await client.domains.list();
  }
}

