// =============================================================================
// SetPasswordForm — React island (client:load)
//
// For OAuth-only accounts (Google, GitHub) that don't have a password yet.
// Calls POST /users/me/password to add password authentication so the user
// can also sign in with email + password going forward.
//
// Uses: TanStack Form v1, shadcn Input/Label/Button, sonner toasts
// Validation: revalidateLogic + zodValidator + zodFieldError (cross-field)
// =============================================================================

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { setPasswordSchema } from "@repo/common/schemas";
import type { SetPasswordInput } from "@repo/common/schemas";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { queryClient } from "@/lib/query-client";
import {
  revalidateLogic,
  zodFieldError,
  zodValidator,
} from "@/lib/form-validators";
import { useSetPassword } from "@/hooks/mutations/useSetPassword";

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

// ── Inner form ────────────────────────────────────────────────────────────────

function SetPasswordFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const setPasswordMutation = useSetPassword();
  const revalidate = revalidateLogic();

  const form = useForm<SetPasswordInput>({
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
    validators: {
      onDynamic: zodValidator(setPasswordSchema),
    },
    onSubmit: async ({ value }) => {
      const result = setPasswordSchema.safeParse(value);
      if (!result.success) {
        toast.error("Data tidak valid", {
          description: result.error.issues[0]?.message ?? "Periksa kembali isian kamu.",
        });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        setPasswordMutation.mutate(result.data, {
          onSuccess: () => {
            setDone(true);
            toast.success("Password berhasil dibuat", {
              description: "Sekarang kamu bisa masuk dengan email dan password.",
            });
            resolve();
          },
          onError: (err) => {
            const message = err.message ?? "Terjadi kesalahan. Coba lagi.";
            // If the account already has a password, guide the user
            if (message.toLowerCase().includes("already")) {
              toast.error("Akun sudah punya password", {
                description: "Gunakan halaman Ubah Password untuk menggantinya.",
              });
            } else {
              toast.error("Gagal membuat password", { description: message });
            }
            reject(err);
          },
        });
      });
    },
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CheckCircle className="size-12 text-green-500" />
        <div>
          <p className="font-semibold text-gray-900">Password berhasil dibuat</p>
          <p className="mt-1 text-sm text-gray-500">
            Mulai sekarang kamu bisa masuk dengan email dan password, selain OAuth.
          </p>
        </div>
        <a
          className="text-accent text-sm hover:underline"
          href="/profile/change-password"
        >
          Ubah password lagi
        </a>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-blue-500" />
        <p className="text-xs leading-relaxed text-blue-700">
          Akun kamu saat ini hanya bisa masuk via Google atau GitHub. Tambahkan
          password agar kamu juga bisa masuk dengan email dan password.
        </p>
      </div>

      {/* Password baru */}
      <form.Field
        name="newPassword"
        validators={{
          onBlur: ({ value }) => {
            const r = setPasswordSchema.shape.newPassword.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
          onChange: ({ value }) => {
            const r = setPasswordSchema.shape.newPassword.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="sp-new">Password Baru</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="new-password"
                className="pr-10"
                id="sp-new"
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
                aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
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

      {/* Konfirmasi password — cross-field via onDynamic + onChangeListenTo */}
      <form.Field
        name="confirmNewPassword"
        validators={{
          onChangeListenTo: ["newPassword"],
          onDynamic: ({ fieldApi }) =>
            zodFieldError(setPasswordSchema, "confirmNewPassword", fieldApi.form.state.values),
          onBlur: ({ fieldApi }) =>
            zodFieldError(setPasswordSchema, "confirmNewPassword", fieldApi.form.state.values),
          onChange: ({ fieldApi }) =>
            zodFieldError(setPasswordSchema, "confirmNewPassword", fieldApi.form.state.values),
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="sp-confirm">Konfirmasi Password</Label>
            <Input
              autoComplete="new-password"
              className="mt-1.5"
              id="sp-confirm"
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Ulangi password baru"
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
            disabled={isSubmitting || setPasswordMutation.isPending}
            type="submit"
          >
            {isSubmitting || setPasswordMutation.isPending
              ? "Menyimpan…"
              : "Buat Password"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

// ── Exported island ───────────────────────────────────────────────────────────

export default function SetPasswordForm() {
  return (
    <QueryClientProvider client={queryClient}>
      <SetPasswordFormInner />
    </QueryClientProvider>
  );
}
