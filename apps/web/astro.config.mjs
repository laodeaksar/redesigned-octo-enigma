// @ts-check

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const { PUBLIC_API_URL, INTERNAL_API_URL } = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  ""
);

// https://astro.build/config
export default defineConfig({
  // SSR mode — pages rendered on-demand by Node/Bun
  output: "server",

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
  image: {
    domains: ["localhost"],
  },
});
