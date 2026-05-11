// =============================================================================
// AuthForm — React island for login and register, client:load
// =============================================================================

import { useState } from "react";
import type React from "react";
import { useMutation, QueryClientProvider } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { notify } from "@/lib/toast";

interface Props {
  mode: "login" | "register";
  redirectTo?: string;
}

interface TokenResponse {
  data: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
  };
  success: true;
}

// Sets httpOnly cookies via the Astro SSR endpoint — must stay as raw fetch
// because this is a same-origin call to an Astro API route (not the gateway).
async function setSession(tokens: TokenResponse["data"]): Promise<void> {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    }),
  });
}

// ── Inner component (needs QueryClientProvider context) ───────────────────────

function AuthFormInner({ mode, redirectTo = "/" }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === "login";

  const authMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (isLogin) {
        const res = await api.post<TokenResponse>("/auth/login", {
          email: values.email,
          password: values.password,
        });
        await setSession(res.data);
      } else {
        await api.post("/auth/register", {
          name: values.name,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        // Auto-login after registration
        const res = await api.post<TokenResponse>("/auth/login", {
          email: values.email,
          password: values.password,
        });
        await setSession(res.data);
      }
    },
    onSuccess: () => {
      window.location.href = redirectTo;
    },
    onError: (err: Error) => {
      notify.error(
        isLogin ? "Gagal masuk" : "Gagal mendaftar",
        err.message ?? "Terjadi kesalahan. Coba lagi."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && form.password !== form.confirmPassword) {
      notify.error("Password tidak cocok", "Pastikan kedua password sama.");
      return;
    }

    authMutation.mutate(form);
  };

  const isPending = authMutation.isPending;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {!isLogin && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Nama Lengkap
          </label>
          <input
            className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
            minLength={2}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nama kamu"
            required
            type="text"
            value={form.name}
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          autoComplete="email"
          className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="email@kamu.com"
          required
          type="email"
          value={form.email}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2"
            minLength={8}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 karakter"
            required
            type={showPassword ? "text" : "password"}
            value={form.password}
          />
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(s => !s)}
            type="button"
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
            autoComplete="new-password"
            className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
            onChange={e =>
              setForm(f => ({ ...f, confirmPassword: e.target.value }))
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
        className="bg-accent w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? isLogin
            ? "Masuk…"
            : "Mendaftar…"
          : isLogin
            ? "Masuk"
            : "Daftar Sekarang"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {isLogin ? (
          <>
            Belum punya akun?{" "}
            <a
              className="text-accent font-medium hover:underline"
              href="/auth/register"
            >
              Daftar
            </a>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <a
              className="text-accent font-medium hover:underline"
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

// ── Exported island (wraps with QueryClientProvider) ─────────────────────────

export default function AuthForm(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthFormInner {...props} />
    </QueryClientProvider>
  );
}
