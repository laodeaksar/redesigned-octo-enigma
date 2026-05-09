import type { EmailPayload, MailProvider, SendResult } from "./schemas";

// ── Timeout Helper (local) ────────────────────────────────────────────────────
// Sengaja didefinisikan lokal agar base.provider tidak bergantung pada factory.
// Identik secara fungsional dengan factory/timeout.ts.

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`[Timeout] "${label}" timed out after ${ms}ms`)),
      ms
    );
  });

  // .finally() memastikan timer selalu dibersihkan — tidak leak di event loop
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId));
}

// ── Abstract Base Provider ────────────────────────────────────────────────────

/**
 * Abstract base class untuk semua email provider.
 *
 * ## Hierarki Timeout (penting — jangan diubah tanpa sinkronisasi):
 *
 *   factory/index.ts  →  withTimeout(sendEmail(), 15_000ms)   ← job-level safety net
 *         │
 *         ▼
 *   BaseProvider.send()  →  withTimeout(_send(), 10_000ms)    ← provider-level
 *         │
 *         ▼
 *   _send() (network call: Resend API / SMTP)
 *
 * Inner timeout (10s) selalu lebih kecil dari outer (15s), sehingga:
 * - Network failure → provider timeout fires dulu dengan pesan spesifik
 * - Unexpected hang → factory timeout fires sebagai last resort
 */
export abstract class BaseProvider implements MailProvider {
  protected abstract readonly providerName: string;

  /** HARUS lebih kecil dari timeoutMs factory (default 15_000ms) */
  protected readonly sendTimeoutMs:   number = 10_000;
  protected readonly verifyTimeoutMs: number = 5_000;

  protected abstract _send(payload: EmailPayload): Promise<SendResult>;
  protected abstract _verify(): Promise<void>;

  async send(payload: EmailPayload): Promise<SendResult> {
    try {
      return await withTimeout(
        this._send(payload),
        this.sendTimeoutMs,
        `${this.providerName}.send`
      );
    } catch (err) {
      // Jangan double-wrap jika sudah di-wrap oleh _send() atau timeout
      if (
        err instanceof Error &&
        (err.message.startsWith(`[${this.providerName}]`) ||
         err.message.startsWith("[Timeout]"))
      ) {
        throw err;
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[${this.providerName}] send failed: ${reason}`);
    }
  }

  async verify(): Promise<void> {
    try {
      await withTimeout(
        this._verify(),
        this.verifyTimeoutMs,
        `${this.providerName}.verify`
      );
      console.info(`[Mailer] ${this.providerName} — connection verified ✓`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[Mailer] ${this.providerName} verification failed: ${reason}`);
    }
  }
}

