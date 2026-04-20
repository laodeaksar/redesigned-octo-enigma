// =============================================================================
// AuthForm — React island for login and register, client:load
// =============================================================================

import React, { useState } from "react";
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
          data: { accessToken: string; refreshToken: string; expiresIn: number };
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
          data: { accessToken: string; refreshToken: string; expiresIn: number };
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
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          {error}
        </div>
      )}

      {!isLogin && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Nama Lengkap
          </label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nama kamu"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="email@kamu.com"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 karakter"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {!isLogin && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Konfirmasi Password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            placeholder="Ulangi password"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
      )}

      {isLogin && (
        <div className="flex justify-end">
          <a href="/auth/forgot-password" className="text-xs text-accent hover:underline">
            Lupa password?
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? isLogin ? "Masuk…" : "Mendaftar…"
          : isLogin ? "Masuk" : "Daftar Sekarang"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {isLogin ? (
          <>
            Belum punya akun?{" "}
            <a href="/auth/register" className="font-medium text-accent hover:underline">
              Daftar
            </a>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <a href="/auth/login" className="font-medium text-accent hover:underline">
              Masuk
            </a>
          </>
        )}
      </p>
    </form>
  );
}

