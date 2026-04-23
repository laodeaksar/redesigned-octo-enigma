// =============================================================================
// OAuth routes — Better-auth handles the full PKCE/redirect flow
//
//  GET  /auth/oauth/:provider         — start OAuth flow (redirects to provider)
//  GET  /auth/oauth/:provider/callback — handle redirect back from provider
//  GET  /auth/oauth/providers          — list enabled providers
// =============================================================================

import Elysia, { t } from "elysia";
import { auth } from "@/lib/better-auth";
import { success } from "@repo/common/schemas";
import { env } from "@/config";

const PROVIDER_LABELS: Record<string, { name: string; icon: string }> = {
  google: { name: "Google", icon: "https://www.google.com/favicon.ico" },
  github: { name: "GitHub", icon: "https://github.com/favicon.ico" },
};

export const oauthRoutes = new Elysia({ prefix: "/auth/oauth" })

  // ── List available providers ───────────────────────────────────────────────
  .get("/providers", () => {
    const enabled: Array<{ provider: string; name: string; icon: string }> = [];

    if (env.GOOGLE_CLIENT_ID) {
      enabled.push({ provider: "google", ...PROVIDER_LABELS["google"]! });
    }
    if (env.GITHUB_CLIENT_ID) {
      enabled.push({ provider: "github", ...PROVIDER_LABELS["github"]! });
    }

    return success(enabled);
  }, {
    detail: { tags: ["Auth"], summary: "List enabled OAuth providers" },
  })

  // ── Initiate OAuth flow ────────────────────────────────────────────────────
  // Better-auth handles the full flow via its own handler.
  // We proxy all /api/auth/* requests to Better-auth's toNodeHandler.
  .all("/callback/:provider", async ({ request }) => {
    return auth.handler(request);
  }, {
    params: t.Object({
      provider: t.Union([t.Literal("google"), t.Literal("github")]),
    }),
    detail: { tags: ["Auth"], summary: "OAuth callback (handled by Better-auth)" },
  })

  .all("/:provider", async ({ request }) => {
    return auth.handler(request);
  }, {
    params: t.Object({
      provider: t.Union([t.Literal("google"), t.Literal("github")]),
    }),
    detail: { tags: ["Auth"], summary: "Initiate OAuth flow" },
  });

// ── Better-auth catch-all handler ─────────────────────────────────────────────
// Mount this on /api/auth/* for full Better-auth compatibility
// (session management, sign-in, sign-out, etc.)
export const betterAuthHandler = new Elysia({ prefix: "/api/auth" })
  .all("/*", async ({ request }) => auth.handler(request));

