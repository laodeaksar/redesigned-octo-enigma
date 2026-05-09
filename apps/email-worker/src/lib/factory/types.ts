import type { z } from "zod";
import type { EmailPayload, EmailProviderName } from "@/lib/mailer";

// ── Result Types ──────────────────────────────────────────────────────────────

/** Email berhasil dikirim */
export interface SentResult {
  status:    "sent";
  to:        string;          // comma-separated jika multi-recipient
  provider:  EmailProviderName;
  messageId: string;
  sentAt:    string;          // ISO 8601
}

/** Email dilewati (tidak dikirim) */
export interface SkippedResult {
  status: "skipped";
  reason: "expired" | "rate_limited";
}

export type EmailHandlerResult = SentResult | SkippedResult;

// ── Error Classification ──────────────────────────────────────────────────────

/** Tipe error yang digunakan untuk metrik dan keputusan retry */
export type ErrorType =
  | "validation"   // ZodError, data job korup
  | "template"     // getPayload() throw
  | "timeout"      // send melebihi batas waktu
  | "provider"     // error dari Resend/SMTP
  | "unknown";     // tidak terklasifikasi

// ── Factory Options ───────────────────────────────────────────────────────────

/**
 * Opsi untuk `createEmailHandler`.
 *
 * @template T - Shape data job di queue, harus mengandung `email: string`
 */
export interface CreateEmailHandlerOpts<T extends { email: string }> {
  /** Nama queue BullMQ — digunakan sebagai namespace rate limit & metrik */
  queueName: string;

  /** Zod schema untuk memvalidasi `job.data` */
  schema: z.ZodSchema<T>;

  /**
   * Fungsi yang mengubah data job yang sudah divalidasi menjadi `EmailPayload`.
   * Throw dari sini dianggap non-retriable (bug logika, bukan error transien).
   */
  getPayload: (data: T) => EmailPayload;

  /**
   * Jika diset, email ke address yang sama hanya bisa dikirim sekali
   * dalam durasi ini (dalam detik).
   *
   * Rate limit di-enforce dengan Redis atomic SET NX EX.
   */
  rateLimitSec?: number;

  /**
   * Timeout total untuk operasi `sendEmail()` dalam milidetik.
   * Default: 15_000ms (harus lebih besar dari timeout provider: 10_000ms)
   */
  timeoutMs?: number;

  /**
   * Fungsi opsional yang mengembalikan `true` jika job sudah kadaluarsa
   * dan tidak perlu diproses.
   */
  checkExpiry?: (data: T) => boolean;
}

// ── Metrics Types ─────────────────────────────────────────────────────────────

export interface SuccessMetricOpts {
  queueName:   string;
  provider:    EmailProviderName;
  durationSec: number;
}

export interface FailureMetricOpts {
  queueName: string;
  errorType: ErrorType;
}

