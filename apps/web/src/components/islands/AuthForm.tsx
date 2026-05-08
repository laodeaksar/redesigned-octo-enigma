// =============================================================================
// AuthForm — React island for login and register, client:load
// =============================================================================

import type React from "react";
import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  mode: "login" | "register";
  redirectTo?: string;
}

export default function AuthForm({ mode, redirectTo = "/" }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLogin && form.password !== form.confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.post<{
          success: true;
          data: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        }>("/auth/login", { email: form.email, password: form.password });

        // Post tokens to SSR endpoint to set httpOnly cookies
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            expiresIn: res.data.expiresIn,
          }),
        });
      } else {
        await api.post("/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
        });

        // Auto-login after registration
        const res = await api.post<{
          success: true;
          data: {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
          };
        }>("/auth/login", { email: form.email, password: form.password });

        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
            expiresIn: res.data.expiresIn,
          }),
        });
      }

      window.location.href = redirectTo;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!isLogin && (
        <div>
          <label className="mb-1.5 block font-medium text-gray-700 text-sm">
            Nama Lengkap
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            minLength={2}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nama kamu"
            required
            type="text"
            value={form.name}
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block font-medium text-gray-700 text-sm">
          Email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="email@kamu.com"
          required
          type="email"
          value={form.email}
        />
      </div>

      <div>
        <label className="mb-1.5 block font-medium text-gray-700 text-sm">
          Password
        </label>
        <div className="relative">
          <input
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            minLength={8}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            placeholder="Min. 8 karakter"
            required
            type={showPassword ? "text" : "password"}
            value={form.password}
          />
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword((s) => !s)}
            type="button"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {!isLogin && (
        <div>
          <label className="mb-1.5 block font-medium text-gray-700 text-sm">
            Konfirmasi Password
          </label>
          <input
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            onChange={(e) =>
              setForm((f) => ({ ...f, confirmPassword: e.target.value }))
            }
            placeholder="Ulangi password"
            required
            type="password"
            value={form.confirmPassword}
          />
        </div>
      )}

      {isLogin && (
        <div className="flex justify-end">
          <a
            className="text-accent text-xs hover:underline"
            href="/auth/forgot-password"
          >
            Lupa password?
          </a>
        </div>
      )}

      <button
        className="w-full rounded-lg bg-accent py-3 font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        type="submit"
      >
        {isLoading
          ? isLogin
            ? "Masuk…"
            : "Mendaftar…"
          : isLogin
            ? "Masuk"
            : "Daftar Sekarang"}
      </button>

      <p className="text-center text-gray-500 text-sm">
        {isLogin ? (
          <>
            Belum punya akun?{" "}
            <a
              className="font-medium text-accent hover:underline"
              href="/auth/register"
            >
              Daftar
            </a>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <a
              className="font-medium text-accent hover:underline"
              href="/auth/login"
            >
              Masuk
            </a>
          </>
        )}
      </p>
    </form>
  );
}
