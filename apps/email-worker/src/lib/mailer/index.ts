import { env } from "@/config";
import { SmtpProvider, ResendProvider } from "./providers";
import { emailPayloadSchema, MailProvider, EmailPayload, SendResult } from "./schemas";

// ── Provider instance ─────────────────────────────────────────────────────────

/**
 * Module-level singleton — di-instantiate sekali saat module di-load.
 * Aman untuk Cloudflare Workers dan Node.js karena tidak ada state mutable
 * yang di-share antar request.
 *
 * ⚠️  SmtpProvider memerlukan Node.js runtime. Jika deploy ke CF Workers,
 * pastikan RESEND_API_KEY ter-set agar ResendProvider yang dipilih.
 */
const provider: MailProvider = env.RESEND_API_KEY
  ? new ResendProvider()
  : new SmtpProvider();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Kirim transactional email.
 *
 * Memvalidasi payload dengan Zod sebelum dispatch.
 * - Resend dipilih jika `RESEND_API_KEY` tersedia
 * - SMTP digunakan sebagai fallback (hanya Node.js runtime)
 *
 * @throws {z.ZodError} – jika payload gagal validasi
 * @throws {Error}      – jika provider mengembalikan error
 */
export async function sendEmail(raw: unknown): Promise<SendResult> {
  const payload = emailPayloadSchema.parse(raw);
  return provider.send(payload);
}

/**
 * Verifikasi koneksi provider aktif.
 * Panggil sekali saat startup untuk mendeteksi misconfiguration lebih awal.
 *
 * Sudah dilengkapi timeout internal (5 detik) via BaseProvider.
 *
 * @throws {Error} – jika provider tidak terjangkau atau kredensial salah
 */
export async function verifyMailer(): Promise<void> {
  return provider.verify();
}

// ── Re-exports ────────────────────────────────────────────────────────────────
// Eksplisit agar tidak bocorkan internal types secara tidak sengaja

export type { EmailPayload, SendResult, MailProvider } from "./schemas";
export { emailPayloadSchema } from "./schemas";

