/**
 * Membungkus sebuah Promise dengan batas waktu.
 *
 * Jika `promise` tidak resolve/reject dalam `ms` milidetik,
 * Promise dikembalikan akan reject dengan error timeout berisi `label`.
 *
 * @param promise - Promise yang akan diawasi
 * @param ms      - Batas waktu dalam milidetik
 * @param label   - Label untuk pesan error (membantu debugging)
 *
 * @example
 * const result = await withTimeout(sendEmail(payload), 15_000, "sendEmail");
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation"
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`[Timeout] "${label}" timed out after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    // Selalu bersihkan timer agar tidak leak di event loop
    clearTimeout(timerId);
  });
}

