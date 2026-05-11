// =============================================================================
// CORS origin builder — supports wildcard (*) and comma-separated allowlist
// =============================================================================

/**
 * Parse CORS_ORIGINS env value into a Hono `origin` option.
 *
 * - `"*"` → allow any origin (development only)
 * - `"https://a.com,https://b.com"` → exact allowlist
 * - `""` → fall back to localhost:5000
 */
export function buildCorsOrigin(
  raw: string
): string | string[] | ((origin: string) => string | undefined) {
  const trimmed = raw.trim();

  if (trimmed === "*") return "*";

  const origins = trimmed
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

  if (origins.length === 0) return "http://localhost:5000";
  if (origins.length === 1) return origins[0]!;

  return (origin: string) => (origins.includes(origin) ? origin : undefined);
}
