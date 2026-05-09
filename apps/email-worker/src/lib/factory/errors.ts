/**
 * Custom error classes untuk factory pipeline.
 *
 * Menggunakan `instanceof` untuk klasifikasi — lebih aman dan reliabel
 * daripada string prefix matching atau properti yang ditempel via `any`.
 *
 * ## Hierarki
 *
 *   Error
 *   ├── TemplateError   — getPayload() gagal (bug logika, non-retriable)
 *   └── [ZodError]      — schema.parse() gagal (data korup, non-retriable)
 *       dari package "zod"
 */

// ── TemplateError ─────────────────────────────────────────────────────────────

/**
 * Dilempar ketika `getPayload(data)` gagal membangun `EmailPayload`.
 *
 * Dianggap **non-retriable**: jika logika template salah, retry tidak akan
 * menghasilkan output yang berbeda.
 *
 * Menyimpan error original sebagai `cause` agar stack trace tidak hilang.
 *
 * @example
 * throw new TemplateError("Missing required field: userId", originalErr);
 */
export class TemplateError extends Error {
  override readonly name = "TemplateError";

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

// ── Type Guards ───────────────────────────────────────────────────────────────

/** Type guard untuk ZodError tanpa import langsung dari "zod" */
export function isZodError(err: unknown): err is Error & { issues: unknown[] } {
  return (
    err instanceof Error &&
    (err.constructor.name === "ZodError" || "issues" in err)
  );
}

