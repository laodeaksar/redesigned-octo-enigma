// =============================================================================
// ChangePasswordForm — React island (client:load)
// Uses: TanStack Form v1, shadcn Input/Label/Button, sonner toasts
//
// Validation pattern — mirrors user's desired pattern:
//
//   const revalidate = revalidateLogic()
//   const form = useForm({
//     defaultValues: { ... },
//     validators: { onDynamic: zodValidator(changePasswordSchema) },
//   })
//
// - Form-level `onDynamic` validates the whole schema on every state change.
//   Errors surface in `form.state.errors` (shown as a form-level banner).
// - Field-level validators use `zodFieldError` + `onChangeListenTo` for
//   per-field inline errors, including cross-field refinement rules.
// - `revalidateLogic("onTouched")` controls when errors are rendered —
//   silent while the user hasn't touched a field yet.
// =============================================================================

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { changePasswordSchema } from "@repo/common/schemas";
import type { ChangePasswordInput } from "@repo/common/schemas";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { queryClient } from "@/lib/query-client";
import {
  revalidateLogic,
  zodFieldError,
  zodValidator,
} from "@/lib/form-validators";
import { useChangePassword } from "@/hooks/mutations/useChangePassword";

// ── Shared field error — shown only when revalidate.shouldShow is true ─────────

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

function ChangePasswordFormInner() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [done, setDone] = useState(false);
  const changeMutation = useChangePassword();

  // revalidateLogic controls WHEN errors render — "onTouched" means errors
  // are silent until the user has interacted with the field (or submitted).
  const revalidate = revalidateLogic();

  const form = useForm<ChangePasswordInput>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
    // Form-level onDynamic: validates the whole schema on every state change.
    // This catches cross-field rules (passwords match, new ≠ current).
    // Errors from this go to form.state.errors (rendered as a banner below).
    validators: {
      onDynamic: zodValidator(changePasswordSchema),
    },
    onSubmit: async ({ value }) => {
      const result = changePasswordSchema.safeParse(value);
      if (!result.success) {
        toast.error("Data tidak valid", {
          description: result.error.issues[0]?.message ?? "Periksa kembali isian kamu.",
        });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        changeMutation.mutate(result.data, {
          onSuccess: () => {
            setDone(true);
            toast.success("Password berhasil diubah");
            resolve();
          },
          onError: (err) => {
            toast.error("Gagal mengubah password", {
              description: err.message ?? "Terjadi kesalahan. Coba lagi.",
            });
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
          <p className="font-semibold text-gray-900">Password berhasil diubah</p>
          <p className="mt-1 text-sm text-gray-500">
            Gunakan password baru saat login berikutnya.
          </p>
        </div>
        <button
          className="text-accent text-sm hover:underline"
          onClick={() => {
            setDone(false);
            form.reset();
          }}
          type="button"
        >
          Ubah password lagi
        </button>
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
      {/* Password saat ini */}
      <form.Field
        name="currentPassword"
        validators={{
          onBlur: ({ value }) => {
            if (!value) return "Password saat ini diperlukan";
            return undefined;
          },
          onChange: ({ value }) => {
            if (!value) return "Password saat ini diperlukan";
            return undefined;
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="cp-current">Password Saat Ini</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="current-password"
                className="pr-10"
                id="cp-current"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Password saat ini"
                type={showCurrent ? "text" : "password"}
                value={field.state.value}
                aria-invalid={
                  revalidate.shouldShow(field.state.meta.isTouched) &&
                  field.state.meta.errors.length > 0
                }
              />
              <button
                aria-label={showCurrent ? "Sembunyikan" : "Tampilkan"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowCurrent((s) => !s)}
                type="button"
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Password baru — onDynamic + onChangeListenTo for cross-field rule:
          "new password must be different from current password" */}
      <form.Field
        name="newPassword"
        validators={{
          onChangeListenTo: ["currentPassword"],
          onBlur: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "newPassword",
              fieldApi.form.state.values,
            ),
          onChange: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "newPassword",
              fieldApi.form.state.values,
            ),
          // onDynamic fires when currentPassword changes (via onChangeListenTo)
          onDynamic: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "newPassword",
              fieldApi.form.state.values,
            ),
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="cp-new">Password Baru</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="new-password"
                className="pr-10"
                id="cp-new"
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Min. 8 karakter"
                type={showNew ? "text" : "password"}
                value={field.state.value}
                aria-invalid={
                  revalidate.shouldShow(field.state.meta.isTouched) &&
                  field.state.meta.errors.length > 0
                }
              />
              <button
                aria-label={showNew ? "Sembunyikan" : "Tampilkan"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowNew((s) => !s)}
                type="button"
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError
              errors={field.state.meta.errors as string[]}
              show={revalidate.shouldShow(field.state.meta.isTouched)}
            />
          </div>
        )}
      </form.Field>

      {/* Konfirmasi password baru — onDynamic + onChangeListenTo:
          re-validates whenever newPassword changes */}
      <form.Field
        name="confirmNewPassword"
        validators={{
          onChangeListenTo: ["newPassword"],
          onBlur: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "confirmNewPassword",
              fieldApi.form.state.values,
            ),
          onChange: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "confirmNewPassword",
              fieldApi.form.state.values,
            ),
          // onDynamic fires when newPassword changes (via onChangeListenTo)
          onDynamic: ({ fieldApi }) =>
            zodFieldError(
              changePasswordSchema,
              "confirmNewPassword",
              fieldApi.form.state.values,
            ),
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="cp-confirm">Konfirmasi Password Baru</Label>
            <Input
              autoComplete="new-password"
              className="mt-1.5"
              id="cp-confirm"
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

      {/* Form-level error banner from onDynamic (cross-field rules) */}
      <form.Subscribe selector={(s) => ({ errors: s.errors, isSubmitting: s.isSubmitting })}>
        {({ errors, isSubmitting }) => (
          <>
            {errors.length > 0 && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {String(errors[0])}
              </p>
            )}
            <Button
              className="bg-accent w-full py-5 text-sm font-semibold text-white hover:opacity-90"
              disabled={isSubmitting || changeMutation.isPending}
              type="submit"
            >
              {isSubmitting || changeMutation.isPending
                ? "Menyimpan…"
                : "Simpan Password Baru"}
            </Button>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}

// ── Exported island ───────────────────────────────────────────────────────────

export default function ChangePasswordForm() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChangePasswordFormInner />
    </QueryClientProvider>
  );
}
