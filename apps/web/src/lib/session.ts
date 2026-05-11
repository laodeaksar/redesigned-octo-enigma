// =============================================================================
// session.ts — client-side session helpers
//
// setSession: posts tokens to the Astro SSR endpoint (/api/auth/session) which
// sets httpOnly cookies in the browser. This MUST remain a raw fetch — it is a
// same-origin Astro API route call, NOT a call to the external gateway.
// =============================================================================

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export async function setSession(tokens: AuthTokens): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    }),
  });

  if (!res.ok) {
    throw new Error("Gagal menyimpan sesi. Coba lagi.");
  }
}
