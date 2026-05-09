import { env } from "@/config";
import type { EmailPayload, SendResult } from "../schemas.fixed";
import { formatSender, resolveReplyTo } from "../utils";
import { BaseProvider } from "/base.provider";

// ── API Constants ─────────────────────────────────────────────────────────────

const SEND_URL = "https://api.mailchannels.net/tx/v1/send";

// ── Internal Request Types ────────────────────────────────────────────────────

interface MCAddress {
  email: string;
  name?: string;
}

interface MCPersonalization {
  to:        MCAddress[];
  cc?:       MCAddress[];
  bcc?:      MCAddress[];
  reply_to?: MCAddress;
  headers?:  Record<string, string>;
  // DKIM per-personalization — takes precedence over body-level DKIM
  dkim_domain?:      string;
  dkim_selector?:    string;
  dkim_private_key?: string;
}

interface MCContent {
  type:  "text/html" | "text/plain";
  value: string;
}

interface MCAttachment {
  type:     string; // MIME type, e.g. "image/png"
  filename: string;
  content:  string; // base64-encoded content
}

interface MCSendRequest {
  personalizations: MCPersonalization[];
  from:             MCAddress;
  subject:          string;
  content:          MCContent[];
  attachments?:     MCAttachment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse "Display Name <email@example.com>" atau "email@example.com"
 * menjadi MCAddress.
 *
 * Digunakan untuk mengkonversi output formatSender() dan resolveReplyTo()
 * ke format yang dibutuhkan MailChannels API.
 */
function parseAddress(raw: string): MCAddress {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) {
    const name = match[1].trim();
    return { email: match[2].trim(), ...(name ? { name } : {}) };
  }
  return { email: raw.trim() };
}

/**
 * Konversi array email string ke MCAddress[].
 * recipientSchema sudah normalisasi ke string[] — tidak perlu Array.isArray.
 */
function toAddresses(emails: string[]): MCAddress[] {
  return emails.map((email) => ({ email }));
}

/**
 * Encode string atau Uint8Array ke base64.
 *
 * Kompatibel dengan Cloudflare Workers (menggunakan Web API `btoa`).
 * Menghindari spread operator untuk array besar (risiko stack overflow).
 */
function toBase64(input: string | Uint8Array): string {
  if (typeof input === "string") return btoa(input);

  let binary = "";
  const len = input.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(input[i]!);
  }
  return btoa(binary);
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Email provider menggunakan MailChannels API.
 *
 * ## Keunggulan vs SmtpProvider (nodemailer):
 * - ✅ Kompatibel dengan Cloudflare Workers (hanya butuh `fetch`)
 * - ✅ Tidak ada dependency Node.js built-in (net, tls, dns)
 * - ✅ DKIM signing built-in via env vars
 * - ✅ Dry-run untuk verify() — tidak kirim email sungguhan
 * - ✅ Error response terstruktur (JSON)
 *
 * ## Required env vars:
 * - `MAILCHANNELS_API_KEY` — API key dari MailChannels console
 *
 * ## Optional env vars (sangat disarankan untuk deliverability):
 * - `MAILCHANNELS_DKIM_DOMAIN`      — domain DKIM (harus align dengan From)
 * - `MAILCHANNELS_DKIM_SELECTOR`    — selector DKIM (e.g., "mailchannels")
 * - `MAILCHANNELS_DKIM_PRIVATE_KEY` — private key base64-encoded
 *
 * ## Setup DNS yang diperlukan:
 * 1. SPF: tambahkan `include:relay.mailchannels.net` ke TXT record domain
 * 2. DKIM: tambahkan TXT record `{selector}._domainkey.{domain}`
 * 3. Domain Lockdown: TXT record `_mailchannels.{domain}` dengan sender ID
 *
 * @see https://docs.mailchannels.net/email-api/sending-email/email-intro
 * @see https://docs.mailchannels.net/email-api/dkim/
 */
export class MailChannelsProvider extends BaseProvider {
  protected readonly providerName = "MailChannels";

  // ── Accessor helpers ────────────────────────────────────────────────────────

  private get apiKey(): string {
    return env.MAILCHANNELS_API_KEY ?? "";
  }

  private get dkimConfig(): {
    domain?:     string;
    selector?:   string;
    privateKey?: string;
  } {
    return {
      domain:     env.MAILCHANNELS_DKIM_DOMAIN,
      selector:   env.MAILCHANNELS_DKIM_SELECTOR,
      privateKey: env.MAILCHANNELS_DKIM_PRIVATE_KEY,
    };
  }

  // ── Request builder ─────────────────────────────────────────────────────────

  private buildRequest(payload: EmailPayload): MCSendRequest {
    const sender  = payload.from ?? formatSender();
    const replyTo = resolveReplyTo(payload);
    const dkim    = this.dkimConfig;

    // Personalization — satu grup penerima dengan DKIM dan header opsional
    const personalization: MCPersonalization = {
      to: toAddresses(payload.to),

      ...(payload.cc  && { cc:  toAddresses(payload.cc)  }),
      ...(payload.bcc && { bcc: toAddresses(payload.bcc) }),

      // resolveReplyTo bisa return string atau string[] — ambil yang pertama
      ...(replyTo && {
        reply_to: parseAddress(Array.isArray(replyTo) ? replyTo[0]! : replyTo),
      }),

      ...(payload.headers && Object.keys(payload.headers).length > 0 && {
        headers: payload.headers,
      }),

      // DKIM — per-personalization takes precedence over body-level
      // Hanya di-set jika ketiga nilai tersedia (semua wajib untuk signing)
      ...(dkim.domain && dkim.selector && dkim.privateKey && {
        dkim_domain:      dkim.domain,
        dkim_selector:    dkim.selector,
        dkim_private_key: dkim.privateKey,
      }),
    };

    // Content — HTML wajib, text opsional
    // Urutan: HTML dulu, kemudian plain text (sesuai email RFC convention)
    const content: MCContent[] = [
      { type: "text/html",  value: payload.html },
      ...(payload.text ? [{ type: "text/plain" as const, value: payload.text }] : []),
    ];

    // Attachments — encode ke base64, fallback MIME type ke octet-stream
    const attachments: MCAttachment[] | undefined = payload.attachments?.map((a) => ({
      type:     a.contentType ?? "application/octet-stream",
      filename: a.filename,
      content:  toBase64(a.content),
    }));

    return {
      personalizations: [personalization],
      from:             parseAddress(sender),
      subject:          payload.subject,
      content,
      ...(attachments?.length ? { attachments } : {}),
    };
  }

  // ── HTTP helper ─────────────────────────────────────────────────────────────

  private async post(body: MCSendRequest, dryRun = false): Promise<Response> {
    const url = dryRun ? `${SEND_URL}?dry-run=true` : SEND_URL;

    return fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        // API key wajib untuk autentikasi; tanpa ini request akan 403
        ...(this.apiKey ? { "X-Api-Key": this.apiKey } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  // ── Error parser ─────────────────────────────────────────────────────────────

  /**
   * Parsing error response dari MailChannels API.
   * API mengembalikan JSON dengan field `errors` (array) atau `message` (string).
   */
  private async parseErrorDetail(res: Response): Promise<string> {
    try {
      const body = await res.json() as { errors?: string[]; message?: string };
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        return body.errors.join("; ");
      }
      if (body.message) return body.message;
    } catch {
      // Response body bukan JSON — gunakan statusText
    }
    return res.statusText.trim() || `HTTP ${res.status}`;
  }

  // ── MailProvider implementation ─────────────────────────────────────────────

  protected async _send(payload: EmailPayload): Promise<SendResult> {
    const request  = this.buildRequest(payload);
    const response = await this.post(request);

    // 202 Accepted = sukses, body kosong
    // Semua status lain = error
    if (response.status !== 202) {
      const detail = await this.parseErrorDetail(response);
      throw new Error(`[MailChannels] ${response.status}: ${detail}`);
    }

    // MailChannels tidak mengembalikan messageId — generate UUID lokal
    // crypto.randomUUID() tersedia di Cloudflare Workers via Web Crypto API
    return {
      messageId: crypto.randomUUID(),
      provider:  "mailchannels",
    };
  }

  protected async _verify(): Promise<void> {
    // ── 1. Validasi env vars ─────────────────────────────────────────────────
    if (!this.apiKey) {
      throw new Error(
        "MAILCHANNELS_API_KEY is not set. " +
        "Create an API key at https://console.mailchannels.net"
      );
    }

    // Warn jika DKIM belum dikonfigurasi — tidak blocking tapi penting
    const { domain, selector, privateKey } = this.dkimConfig;
    const dkimComplete = domain && selector && privateKey;
    if (!dkimComplete) {
      const missing = [
        !domain     && "MAILCHANNELS_DKIM_DOMAIN",
        !selector   && "MAILCHANNELS_DKIM_SELECTOR",
        !privateKey && "MAILCHANNELS_DKIM_PRIVATE_KEY",
      ].filter(Boolean);
      console.warn(
        `[Mailer] MailChannels — DKIM not fully configured (missing: ${missing.join(", ")}). ` +
        "Emails may have lower deliverability. " +
        "See https://docs.mailchannels.net/email-api/dkim/"
      );
    }

    // ── 2. Dry-run request → 200 = API key valid + koneksi OK ───────────────
    // Dry-run tidak mengirim email sungguhan; digunakan khusus untuk verifikasi.
    const response = await this.post(
      {
        personalizations: [{ to: [{ email: "verify@example.com" }] }],
        from:    parseAddress(formatSender()),
        subject: "verify",
        content: [{ type: "text/plain", value: "verify" }],
      },
      true, // dryRun = true → endpoint tambahkan ?dry-run=true
    );

    // 200 = dry-run sukses, 4xx/5xx = misconfiguration atau unreachable
    if (response.status !== 200) {
      const detail = await this.parseErrorDetail(response);
      throw new Error(
        `[MailChannels] Verification failed (${response.status}): ${detail}`
      );
    }
  }
}

