// =============================================================================
// CORS origin handler
//
// Hono's cors middleware accepts `origin` as:
//   string          – a single literal origin
//   string[]        – exact allowlist (Hono echoes the matching value)
//   (origin) => …   – function that returns the allowed origin or null
//
// We always use the function form so we can:
//   1. Support a single wildcard "*" entry without sending "Access-Control-
//      Allow-Origin: *" — the CORS spec forbids that when credentials:true, so
//      we must reflect the actual request origin instead.
//   2. Match exact origins from the comma-separated CORS_ORIGINS env var.
//   3. Log blocked origins in development to make misconfiguration obvious.
//
// Usage:
//   cors({ origin: buildCorsOrigin(env.CORS_ORIGINS), credentials: true })
//
// Env var format examples:
//   CORS_ORIGINS=*                                     ← allow any (dev only)
//   CORS_ORIGINS=https://myapp.replit.app              ← single origin
//   CORS_ORIGINS=https://store.com,https://admin.com   ← multiple origins
// =============================================================================

export function buildCorsOrigin(
  origins: string[]
): (requestOrigin: string) => string | null {
  const allowAll = origins.includes("*");
  const allowSet = new Set(origins);
  const isDev = process.env.NODE_ENV !== "production";

  return (requestOrigin: string): string | null => {
    if (allowAll) {
      // Reflect the actual origin instead of "*" — required for credentials:true
      return requestOrigin;
    }

    if (allowSet.has(requestOrigin)) {
      return requestOrigin;
    }

    if (isDev) {
      console.warn(
        `[CORS] Blocked origin: ${requestOrigin} — not in CORS_ORIGINS (${[...allowSet].join(", ")})`
      );
    }

    return null;
  };
}
