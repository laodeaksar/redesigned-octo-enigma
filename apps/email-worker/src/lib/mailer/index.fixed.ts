import { env } from "@/config";
import { 
  MailChannelsProvider,
  ResendProvider
} from "./providers";
import { emailPayloadSchema, MailProvider, EmailPayload, SendResult } from "./schemas";

// ── Provider instance ─────────────────────────────────────────────────────────

/**
 * Module-level singleton — di-instantiate sekali saat module di-load.
 *
 * Urutan prioritas provider:
 * 1. ResendProvider     → jika RESEND_API_KEY tersedia
 * 2. MailChannelsProvider → fallback (menggunakan MAILCHANNELS_API_KEY)
 *
 * Keduanya hanya bergantung pada `fetch` — kompatibel penuh dengan
 * Cloudflare Workers, Node.js, dan Edge Runtime.
 */
const provider: MailProvider = env.RESEND_API_KEY
  ? new ResendProvider()
  : new MailChannelsProvider();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Kirim transactional email.
 *
 * Memvalidasi payload dengan Zod sebelum dispatch.
 * - ResendProvider dipilih jika `RESEND_API_KEY` tersedia
 * - MailChannelsProvider digunakan sebagai fallback (`MAILCHANNELS_API_KEY`)
 *
 * @throws {z.ZodError} – jika payload gagal validasi
 * @throws {Error}      – jika provider mengembalikan error
 */
export async function sendEmail(raw: unknown): Promise<SendResult> {
  //                            ^^^^^^^ ganti dari EmailPayload ke unknown
  //                                    agar validasi Zod benar-benar berguna
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

