// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { loadEnv } from "vite";

const { PUBLIC_API_URL } = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  // SSR mode — pages rendered on-demand by Node/Bun
  output: "server",

  integrations: [
    react(),
  ],

  // Dev server configuration
  server: {
    port: 5000,
    host: "0.0.0.0",
  },

  vite: {
    //@ts-ignore
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.PUBLIC_API_URL": JSON.stringify(PUBLIC_API_URL ?? "http://localhost:3000"),
    },
    server: {
      allowedHosts: true,
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
