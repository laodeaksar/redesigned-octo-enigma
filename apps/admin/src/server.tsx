// =============================================================================
// Server entry point — TanStack Start SSR handler
// =============================================================================

import { getRouterManifest } from "@tanstack/start/router-manifest";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/start/server";
import { router } from "./router";

export default createStartHandler({
  createRouter: () => router,
  getRouterManifest,
})(defaultStreamHandler);
