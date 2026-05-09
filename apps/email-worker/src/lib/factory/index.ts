import { ZodError } from "zod";
import { UnrecoverableError } from "bullmq";

import { redis } from "@/config";
import type { Job, Processor } from "@repo/common/events";

import { sendEmail } from "@/lib/mailer";
import { withJobLogger } from "@/lib/logger-wrapper";

import { withTimeout } from "./timeout";
import { recordFailure, recordSuccess, classifyError } from "./metrics";
import type {
  EmailHandlerResult,
  CreateEmailHandlerOpts,
  ErrorType,
} from "./types";

export type { EmailHandlerResult, CreateEmailHandlerOpts };

// ── Rate Limiter ──────────────────────────────────────────────────────────────

/**
 * Cek dan set rate limit menggunakan operasi Redis atomik SET NX EX.
 *
 * Mengembalikan `true` jika email ini sudah rate-limited (harus di-skip).
 *
 * ## Kenapa SET NX bukan GET + SETEX?
 * GET lalu SETEX adalah dua operasi terpisah — tidak atomik.
 * Dua worker concurrent bisa keduanya GET null lalu keduanya SETEX,
 * mengakibatkan dua email terkirim ke user yang sama (TOCTOU race condition).
 * SET NX EX adalah satu operasi atomik yang mencegah hal ini.
 *
 * @param email     - Alamat email penerima
 * @param queueName - Nama queue (sebagai namespace)
 * @param ttlSec    - Durasi rate limit dalam detik
 */
async function checkRateLimit(
  email: string,
  queueName: string,
  ttlSec: number
): Promise<boolean> {
  // Key diberi versi "v1" agar mudah di-invalidate saat logika berubah
  const key = `ratelimit:v1:${queueName}:${email}`;

  // SET key "1" EX ttlSec NX
  // → null  = key baru di-set  = belum rate-limited → kirim email
  // → "OK"  = key sudah ada    = rate-limited → skip
  // Ioredis mengembalikan null jika NX gagal (key sudah ada)
  const result = await redis.set(key, "1", "EX", ttlSec, "NX");
  return result === null; // null = sudah ada = rate limited
}

// ── Error Handling ────────────────────────────────────────────────────────────

/**
 * Tentukan apakah error ini bisa di-retry oleh BullMQ atau tidak.
 *
 * Error non-retriable (data/logika) dilempar sebagai `UnrecoverableError`
 * agar BullMQ memindahkan job ke failed queue tanpa retry.
 *
 * Error retriable (network, timeout, provider transient) dilempar biasa
 * dan akan masuk mekanisme retry BullMQ.
 */
function handleError(err: unknown, queueName: string): never {
  const errorType = classifyError(err);
  recordFailure({ queueName, errorType });

  // Error yang tidak akan pernah berhasil di-retry → langsung failed
  const nonRetriable: ErrorType[] = ["validation", "template"];
  if (nonRetriable.includes(errorType)) {
    const message = err instanceof Error ? err.message : String(err);
    throw new UnrecoverableError(
      `[${queueName}] Non-retriable error (${errorType}): ${message}`
    );
  }

  // Error retriable (timeout, provider, unknown) → BullMQ retry normal
  throw err;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Membuat BullMQ Processor untuk mengirim email dari sebuah queue.
 *
 * Processor yang dikembalikan:
 * 1. Memvalidasi `job.data` dengan Zod schema (non-retriable jika gagal)
 * 2. Membangun `EmailPayload` via `getPayload` (non-retriable jika throw)
 * 3. Mengecek expiry via `checkExpiry` (skip jika kadaluarsa)
 * 4. Mengecek rate limit via Redis atomic SET NX (skip jika terkena limit)
 * 5. Mengirim email dengan timeout job-level (default 15s)
 * 6. Mencatat metrik sukses/gagal
 *
 * @template T - Shape data job, harus mengandung `email: string`
 *
 * @example
 * const processor = createEmailHandler({
 *   queueName: "welcome-email",
 *   schema: welcomeJobSchema,
 *   getPayload: (data) => buildWelcomeEmail(data),
 *   rateLimitSec: 3600,   // max 1 email per jam per address
 *   timeoutMs: 15_000,
 *   checkExpiry: (data) => isPast(data.expiresAt),
 * });
 *
 * new Worker("welcome-email", processor, { connection: redis });
 */
export function createEmailHandler<T extends { email: string }>(
  opts: CreateEmailHandlerOpts<T>
): Processor<T> {
  const {
    queueName,
    schema,
    getPayload,
    rateLimitSec,
    // 15s job-level timeout > 10s provider-level timeout (BaseProvider)
    // → provider timeout fires first untuk network failure
    // → job timeout hanya sebagai last-resort safety net
    timeoutMs = 15_000,
    checkExpiry,
  } = opts;

  async function processor(job: Job<T>): Promise<EmailHandlerResult> {
    // ── 1. Validasi job data ─────────────────────────────────────────────────
    // ZodError di sini → data korup → non-retriable
    let data: T;
    try {
      data = schema.parse(job.data);
    } catch (err) {
      // Re-classify agar handleError mengenali ini sebagai "validation"
      if (err instanceof ZodError) throw err;
      throw err;
    }

    // ── 2. Build email payload ───────────────────────────────────────────────
    // Error dari getPayload dianggap bug logika template → non-retriable
    let payload: ReturnType<typeof getPayload>;
    try {
      payload = getPayload(data);
    } catch (err) {
      // Wrap dengan errorType "template" agar handleError mengenali
      const reason = err instanceof Error ? err.message : String(err);
      const templateError = new Error(`[Template] ${reason}`);
      (templateError as any).errorType = "template";
      throw templateError;
    }

    // ── 3. Expiry check ──────────────────────────────────────────────────────
    if (checkExpiry?.(data)) {
      console.info(
        `[${queueName}] Job ${job.id} skipped — expired (email: ${data.email})`
      );
      return { status: "skipped", reason: "expired" };
    }

    // ── 4. Rate limit check (atomic) ─────────────────────────────────────────
    if (rateLimitSec && (await checkRateLimit(data.email, queueName, rateLimitSec))) {
      console.info(
        `[${queueName}] Job ${job.id} skipped — rate_limited (email: ${data.email})`
      );
      return { status: "skipped", reason: "rate_limited" };
    }

    // ── 5. Send email ────────────────────────────────────────────────────────
    const startMs = performance.now(); // lebih akurat dari Date.now() untuk durasi

    // timeoutMs (15s) > BaseProvider.sendTimeoutMs (10s):
    // Inner provider timeout fires dulu untuk network failure dengan pesan spesifik.
    // Outer (factory) timeout hanya sebagai absolute safety net.
    const result = await withTimeout(
      sendEmail(payload),
      timeoutMs,
      `${queueName}.sendEmail`
    );

    // Capture sentAt tepat setelah send selesai, sebelum operasi lain
    const sentAt      = new Date().toISOString();
    const durationSec = (performance.now() - startMs) / 1000;

    // ── 6. Record success ────────────────────────────────────────────────────
    recordSuccess({ queueName, provider: result.provider, durationSec });

    // ── 7. Return result ─────────────────────────────────────────────────────
    // payload.to selalu string[] setelah fix recipientSchema (tidak perlu Array.isArray)
    return {
      status:    "sent",
      to:        payload.to.join(","),
      provider:  result.provider,
      messageId: result.messageId,
      sentAt,
    };
  }

  // Bungkus processor dengan logger, error handler ada di sini
  return withJobLogger(queueName, async (job) => {
    try {
      return await processor(job as Job<T>);
    } catch (err) {
      // handleError: classify → recordFailure → throw (retriable/unrecoverable)
      return handleError(err, queueName);
    }
  });
}

