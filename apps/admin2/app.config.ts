// =============================================================================
// TanStack Start app configuration (Vinxi)
// =============================================================================

import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
    ],
  },
  tsr: {
    // TanStack Router auto code-splitting
    appDirectory: "src",
    routesDirectory: "src/routes",
    generatedRouteTree: "src/routeTree.gen.ts",
    routeFilePrefix: "",
    quoteStyle: "double",
  },
});

