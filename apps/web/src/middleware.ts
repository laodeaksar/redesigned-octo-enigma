// =============================================================================
// Astro middleware — runs on every request before the page
// =============================================================================

import { defineMiddleware } from "astro:middleware";

// Routes that require authentication
const PROTECTED_PATHS = ["/orders", "/checkout", "/profile"];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;

  // Inject a request ID for tracing
  ctx.request.headers.set("x-request-id", crypto.randomUUID());

  // Protect authenticated routes
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    const token = ctx.cookies.get("web_access_token")?.value;
    if (!token) {
      const loginUrl = new URL("/auth/login", ctx.url);
      loginUrl.searchParams.set("redirect", pathname);
      return ctx.redirect(loginUrl.toString());
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/auth/")) {
    const token = ctx.cookies.get("web_access_token")?.value;
    if (token) return ctx.redirect("/");
  }

  return next();
});

