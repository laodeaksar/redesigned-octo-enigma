// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const { PUBLIC_API_URL, INTERNAL_API_URL, S3_PUBLIC_URL, S3_ENDPOINT } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  ""
);

// ── Image remote patterns ──────────────────────────────────────────────────────
// Astro's <Image> / getImage() only processes images from whitelisted origins.
// remotePatterns uses glob-style hostnames; domains is an exact-match list.

/** @type {import('astro').RemotePattern[]} */
const imageRemotePatterns = [
  // AWS S3 — direct bucket URLs and virtual-hosted-style URLs
  // e.g. https://my-bucket.s3.ap-southeast-1.amazonaws.com/...
  //      https://s3.ap-southeast-1.amazonaws.com/my-bucket/...
  { protocol: "https", hostname: "**.amazonaws.com" },

  // Cloudflare R2 — public bucket URLs
  // e.g. https://pub-xxxx.r2.dev/...
  { protocol: "https", hostname: "**.r2.dev" },

  // Supabase Storage — common self-hosted alternative
  // e.g. https://xxxx.supabase.co/storage/v1/object/public/...
  { protocol: "https", hostname: "**.supabase.co" },
];

// Dynamically add the CDN / custom domain from env at build time.
// S3_PUBLIC_URL — front-end CDN URL served to browsers (e.g. a Cloudflare custom domain)
// S3_ENDPOINT   — internal S3-compatible API endpoint (e.g. MinIO, Tigris, Backblaze B2)
for (const rawUrl of [S3_PUBLIC_URL, S3_ENDPOINT]) {
  if (!rawUrl) continue;
  try {
    const { hostname } = new URL(rawUrl);
    if (!imageRemotePatterns.some(p => p.hostname === hostname)) {
      imageRemotePatterns.push({ protocol: "https", hostname });
    }
  } catch {
    // Ignore malformed URL — env validation in product-service catches it at runtime
  }
}

// https://astro.build/config
export default defineConfig({
  // SSR mode — pages rendered on-demand by Node/Bun
  output: "server",

  adapter: node({ mode: "standalone" }),

  integrations: [react()],

  // Dev server configuration
  server: {
    port: 5000,
    host: "0.0.0.0",
  },

  vite: {
    //@ts-expect-error
    plugins: [tailwindcss()],
    define: {
      // PUBLIC_API_URL — injected into both SSR and client bundles
      "import.meta.env.PUBLIC_API_URL": JSON.stringify(
        PUBLIC_API_URL ?? "http://localhost:3000"
      ),
      // INTERNAL_API_URL — compile-time constant for SSR builds only.
      // The client bundle never uses this value because the `import.meta.env.SSR`
      // branch in api.ts is tree-shaken away (SSR = false on the client).
      "import.meta.env.INTERNAL_API_URL": JSON.stringify(
        INTERNAL_API_URL ?? "http://localhost:3000"
      ),
    },
    server: {
      allowedHosts: true,
    },
    ssr: {
      // No externals needed — web-push / postgres / drizzle-orm must NOT be
      // imported by the web frontend. If a build error appears referencing
      // these packages, trace the import and remove it from the source.
      external: [],
      noExternal: [],
    },
  },

  // Allow prefetch on hover for faster navigation
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },

  // Image optimization settings
  // domains   — exact-match hostnames for <Image> / getImage() remote sources
  // remotePatterns — glob-style patterns for S3 providers and CDNs
  image: {
    domains: [
      "localhost",    // dev server
      "placehold.co", // seed data placeholder images
    ],
    remotePatterns: imageRemotePatterns,
  },
});
