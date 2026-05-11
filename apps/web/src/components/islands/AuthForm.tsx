// =============================================================================
// AuthForm — React island for login and register (client:load)
// Uses: TanStack Form v1, shadcn Input/Label/Button, sonner toasts
// Validation: dynamic validators using revalidateLogic + zodValidator
//   - onBlur  → first-touch validation
//   - onChange → real-time validation (shown only after isTouched via revalidate)
//   - onDynamic → cross-field re-validation (confirmPassword ↔ password)
// =============================================================================

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, registerSchema } from "@repo/common/schemas";
import type { LoginInput, RegisterInput } from "@repo/common/schemas";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { queryClient } from "@/lib/query-client";
import {
  revalidateLogic,
  zodFieldError,
  zodValidator,
} from "@/lib/form-validators";
import { useLogin } from "@/hooks/mutations/useLogin";
import { useRegister } from "@/hooks/mutations/useRegister";

interface Props {
  mode: "login" | "register";
  redirectTo?: string;
}

// ── Shared field error ────────────────────────────────────────────────────────

function FieldError({
  errors,
  show,
}: {
  errors: (string | undefined)[];
  show: boolean;
}) {
  if (!show) return null;
  const message = errors.find(Boolean);
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const revalidate = revalidateLogic();

  const form = useForm<LoginInput>({
    defaultValues: { email: "", password: "" },
    validators: {
      onDynamic: zodValidator(loginSchema),
    },
    onSubmit: async ({ value }) => {
      await new Promise<void>((resolve, reject) => {
        loginMutation.mutate(value, {
          onSuccess: () => {
            window.location.href = redirectTo;
            resolve();
          },
          onError: (err) => {
            toast.error("Gagal masuk", {
              description: err.message ?? "Terjadi kesalahan. Coba lagi.",
            });
            reject(err);
          },
        });
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const r = loginSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
          onChange: ({ value }) => {
            const r = loginSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              autoComplete="email"
              className="mt-1.5"
              id="login-email"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="email@kamu.com"
              type="email"
              value={field.state.value}
              aria-invalid={
                revalidate.shouldShow(field.state.meta.isTouched) &&
                field.state.meta.errors.length > 0
              }
            />
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Password */}
      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const r = loginSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password diperlukan");
          },
          onChange: ({ value }) => {
            const r = loginSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password diperlukan");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="login-password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="current-password"
                className="pr-10"
                id="login-password"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Password kamu"
                type={showPassword ? "text" : "password"}
                value={field.state.value}
                aria-invalid={
                  revalidate.shouldShow(field.state.meta.isTouched) &&
                  field.state.meta.errors.length > 0
                }
              />
              <button
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((s) => !s)}
                type="button"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end">
        <a className="text-accent text-xs hover:underline" href="/auth/forgot-password">
          Lupa password?
        </a>
      </div>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            className="bg-accent w-full py-5 text-sm font-semibold text-white hover:opacity-90"
            disabled={isSubmitting || loginMutation.isPending}
            type="submit"
          >
            {isSubmitting || loginMutation.isPending ? "Masuk…" : "Masuk"}
          </Button>
        )}
      </form.Subscribe>

      <p className="text-center text-sm text-gray-500">
        Belum punya akun?{" "}
        <a className="text-accent font-medium hover:underline" href="/auth/register">
          Daftar
        </a>
      </p>
    </form>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────

function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();
  const revalidate = revalidateLogic();

  const form = useForm<RegisterInput>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validators: {
      onDynamic: zodValidator(registerSchema),
    },
    onSubmit: async ({ value }) => {
      const result = registerSchema.safeParse(value);
      if (!result.success) {
        toast.error("Data tidak valid", {
          description: result.error.issues[0]?.message ?? "Periksa kembali isian kamu.",
        });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        registerMutation.mutate(result.data, {
          onSuccess: () => {
            window.location.href = redirectTo;
            resolve();
          },
          onError: (err) => {
            toast.error("Gagal mendaftar", {
              description: err.message ?? "Terjadi kesalahan. Coba lagi.",
            });
            reject(err);
          },
        });
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* Nama */}
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const r = registerSchema.shape.name.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Nama tidak valid");
          },
          onChange: ({ value }) => {
            const r = registerSchema.shape.name.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Nama tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="register-name">Nama Lengkap</Label>
            <Input
              autoComplete="name"
              className="mt-1.5"
              id="register-name"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Nama kamu"
              type="text"
              value={field.state.value}
              aria-invalid={
                revalidate.shouldShow(field.state.meta.isTouched) &&
                field.state.meta.errors.length > 0
              }
            />
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const r = registerSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
          onChange: ({ value }) => {
            const r = registerSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="register-email">Email</Label>
            <Input
              autoComplete="email"
              className="mt-1.5"
              id="register-email"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="email@kamu.com"
              type="email"
              value={field.state.value}
              aria-invalid={
                revalidate.shouldShow(field.state.meta.isTouched) &&
                field.state.meta.errors.length > 0
              }
            />
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Password */}
      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const r = registerSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
          onChange: ({ value }) => {
            const r = registerSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="register-password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="new-password"
                className="pr-10"
                id="register-password"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Min. 8 karakter"
                type={showPassword ? "text" : "password"}
                value={field.state.value}
                aria-invalid={
                  revalidate.shouldShow(field.state.meta.isTouched) &&
                  field.state.meta.errors.length > 0
                }
              />
              <button
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((s) => !s)}
                type="button"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Konfirmasi Password — onDynamic + onChangeListenTo for cross-field */}
      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["password"],
          onDynamic: ({ fieldApi }) =>
            zodFieldError(registerSchema, "confirmPassword", fieldApi.form.state.values),
          onBlur: ({ fieldApi }) =>
            zodFieldError(registerSchema, "confirmPassword", fieldApi.form.state.values),
          onChange: ({ fieldApi }) =>
            zodFieldError(registerSchema, "confirmPassword", fieldApi.form.state.values),
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="register-confirm-password">Konfirmasi Password</Label>
            <Input
              autoComplete="new-password"
              className="mt-1.5"
              id="register-confirm-password"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Ulangi password"
              type="password"
              value={field.state.value}
              aria-invalid={
                revalidate.shouldShow(field.state.meta.isTouched) &&
                field.state.meta.errors.length > 0
              }
            />
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            className="bg-accent w-full py-5 text-sm font-semibold text-white hover:opacity-90"
            disabled={isSubmitting || registerMutation.isPending}
            type="submit"
          >
            {isSubmitting || registerMutation.isPending ? "Mendaftar…" : "Daftar Sekarang"}
          </Button>
        )}
      </form.Subscribe>

      <p className="text-center text-sm text-gray-500">
        Sudah punya akun?{" "}
        <a className="text-accent font-medium hover:underline" href="/auth/login">
          Masuk
        </a>
      </p>
    </form>
  );
}

// ── Inner component ───────────────────────────────────────────────────────────

function AuthFormInner({ mode, redirectTo = "/" }: Props) {
  return mode === "login" ? (
    <LoginForm redirectTo={redirectTo} />
  ) : (
    <RegisterForm redirectTo={redirectTo} />
  );
}

// ── Exported island ───────────────────────────────────────────────────────────

export default function AuthForm(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthFormInner {...props} />
    </QueryClientProvider>
  );
}
