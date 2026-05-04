// =============================================================================
// Better-auth server instance
// Handles OAuth flows: Google, GitHub
// Docs: https://www.better-auth.com
// =============================================================================

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env, db } from "@/config";
import {
  usersTable,
  sessionsTable,
  accountsTable,
  verificationsTable,
} from "@repo/database/drizzle/schema";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // ── Database adapter ───────────────────────────────────────────────────────
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usersTable,
      session: sessionsTable,
      account: accountsTable,
      verification: verificationsTable,
    },
  }),

  // ── Email + Password ───────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // handled separately by our flow
    minPasswordLength: 8,
  },

  // ── Social providers ───────────────────────────────────────────────────────
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            scope: ["openid", "email", "profile"],
          },
        }
      : {}),

    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            scope: ["user:email", "read:user"],
          },
        }
      : {}),
  },

  // ── Session ────────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min client-side cache
    },
  },

  // ── User defaults ──────────────────────────────────────────────────────────
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: false, // not settable by user
      },
    },
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    // After OAuth sign-in, send a welcome email the first time
    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: (user as { role?: string }).role ?? "customer",
        },
      };
    },
  },

  // ── Trusted origins ───────────────────────────────────────────────────────
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    env.NODE_ENV === "development" ? "http://localhost:3010" : "",
    env.NODE_ENV === "development" ? "http://localhost:3011" : "",
  ].filter(Boolean),
});

export type Auth = typeof auth;
