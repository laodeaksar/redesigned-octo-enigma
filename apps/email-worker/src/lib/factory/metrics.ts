import type { SuccessMetricOpts, FailureMetricOpts, ErrorType } from "./types";
import { TemplateError, isZodError } from "./errors";

/**
 * Catat metrik keberhasilan pengiriman email.
 *
 * Implementasikan sesuai observability stack Anda:
 * - Prometheus: gunakan Counter + Histogram
 * - Datadog: gunakan statsd / DogStatsD
 * - CloudWatch: gunakan putMetricData
 * - Console (dev): log ke stdout
 */
export function recordSuccess(opts: SuccessMetricOpts): void {
  const { queueName, provider, durationSec } = opts;

  // TODO: Ganti dengan integrasi metrik production Anda
  console.info(
    `[Metrics] email.sent queue=${queueName} provider=${provider} duration=${durationSec.toFixed(3)}s`
  );

  // Contoh Prometheus (jika menggunakan prom-client):
  // emailSentCounter.inc({ queue: queueName, provider });
  // emailDurationHistogram.observe({ queue: queueName }, durationSec);
}

/**
 * Catat metrik kegagalan pengiriman email.
 *
 * `errorType` memungkinkan diferensiasi alert:
 * - "validation" → alert tim data pipeline
 * - "timeout"    → alert tim infra/SRE
 * - "provider"   → alert on-call + cek status page Resend/SMTP
 * - "template"   → alert tim engineering
 */
export function recordFailure(opts: FailureMetricOpts): void {
  const { queueName, errorType } = opts;

  // TODO: Ganti dengan integrasi metrik production Anda
  console.error(
    `[Metrics] email.failed queue=${queueName} errorType=${errorType}`
  );

  // Contoh Prometheus:
  // emailFailedCounter.inc({ queue: queueName, error_type: errorType });
}

// ── Error Classifier ──────────────────────────────────────────────────────────

/**
 * Mengklasifikasikan error ke dalam kategori metrik yang bermakna.
 * Digunakan untuk `recordFailure` dan keputusan retry di `handleError`.
 *
 * ## Urutan pengecekan (penting — dari yang paling spesifik ke umum):
 * 1. `TemplateError`  → instanceof check (paling andal)
 * 2. ZodError         → instanceof check via isZodError guard
 * 3. Timeout          → prefix pesan dari withTimeout()
 * 4. Provider error   → prefix pesan dari BaseProvider
 * 5. unknown          → fallback
 */
export function classifyError(err: unknown): ErrorType {
  // ── 1. TemplateError — instanceof, bukan string matching ─────────────────
  // Sebelumnya: (err as any).errorType === "template" — tidak reliabel
  if (err instanceof TemplateError) return "template";

  // ── 2. ZodError ───────────────────────────────────────────────────────────
  if (isZodError(err)) return "validation";

  if (!(err instanceof Error)) return "unknown";

  const msg = err.message;

  // ── 3. Timeout — dari withTimeout() di factory atau BaseProvider ──────────
  if (msg.startsWith("[Timeout]")) return "timeout";

  // ── 4. Provider error — dari BaseProvider error wrapping ──────────────────
  if (
    msg.startsWith("[Resend]") ||
    msg.startsWith("[SMTP]")   ||
    msg.startsWith("[Mailer]")
  ) {
    return "provider";
  }

  // ── 5. Fallback ───────────────────────────────────────────────────────────
  return "unknown";
}

