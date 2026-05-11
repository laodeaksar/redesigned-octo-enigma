// =============================================================================
// AuthForm — React island for login and register, client:load
// =============================================================================

import { useState } from "react";
import type React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { useLogin } from "@/hooks/mutations/useLogin";
import { useRegister } from "@/hooks/mutations/useRegister";
import { notify } from "@/lib/toast";

interface Props {
  mode: "login" | "register";
  redirectTo?: string;
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

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && form.password !== form.confirmPassword) {
      notify.error("Password tidak cocok", "Pastikan kedua password sama.");
      return;
    }

    const onSuccess = () => {
      window.location.href = redirectTo;
    };
    const onError = (err: Error) => {
      notify.error(
        isLogin ? "Gagal masuk" : "Gagal mendaftar",
        err.message ?? "Terjadi kesalahan. Coba lagi."
      );
    };

    if (isLogin) {
      loginMutation.mutate(
        { email: form.email, password: form.password },
        { onSuccess, onError }
      );
    } else {
      registerMutation.mutate(
        {
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
        },
        { onSuccess, onError }
      );
    }
  };

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
