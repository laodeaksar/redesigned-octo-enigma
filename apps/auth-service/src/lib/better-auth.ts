// =============================================================================
// Better-auth server instance
// Handles OAuth flows: Google, GitHub
// Admin plugin: role management, ban/unban, user listing, impersonation
// Docs: https://www.better-auth.com
// =============================================================================

import { db, env } from "@/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import {
  accountsTable,
  sessionsTable,
  usersTable,
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

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    admin({
      // Both "admin" and "super_admin" can perform admin actions
      adminRole: ["admin", "super_admin"],
      // New users are assigned "customer" by default
      defaultRole: "customer",
    }),
  ],

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

  // ── Trusted origins ───────────────────────────────────────────────────────
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    env.NODE_ENV === "development" ? "http://localhost:3010" : "",
    env.NODE_ENV === "development" ? "http://localhost:3011" : "",
  ].filter(Boolean),
});

export type Auth = typeof auth;
