import type { APIRoute } from "astro";
import { clearAuthCookies } from "@/lib/auth";
import { api } from "@/lib/api";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get("web_access_token")?.value;

  // Tell auth-service to invalidate the session (best-effort)
  if (token) {
    await api.post("/auth/logout", {}, { token }).catch(() => {});
  }

  clearAuthCookies(cookies);
  return redirect("/", 302);
};

