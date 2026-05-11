// =============================================================================
// ResetPasswordForm — React island (client:load)
// Uses: TanStack Form v1, shadcn Input/Label/Button, sonner toasts
// Validation: revalidateLogic + zodValidator + zodFieldError for cross-field.
//   - onDynamic at form level validates the whole resetPasswordSchema
//   - onDynamic + onChangeListenTo at field level for cross-field revalidation
// =============================================================================

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { resetPasswordSchema } from "@repo/common/schemas";
import type { ResetPasswordInput } from "@repo/common/schemas";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { queryClient } from "@/lib/query-client";
import {
  revalidateLogic,
  zodFieldError,
  zodValidator,
} from "@/lib/form-validators";
import { useResetPassword } from "@/hooks/mutations/useResetPassword";

interface Props {
  token: string;
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

// ── Inner form ────────────────────────────────────────────────────────────────

function ResetPasswordFormInner({ token }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const resetMutation = useResetPassword();
  const revalidate = revalidateLogic();

  const form = useForm<ResetPasswordInput>({
    defaultValues: { token, password: "", confirmPassword: "" },
    validators: {
      onDynamic: zodValidator(resetPasswordSchema),
    },
    onSubmit: async ({ value }) => {
      const result = resetPasswordSchema.safeParse(value);
      if (!result.success) {
        toast.error("Data tidak valid", {
          description: result.error.issues[0]?.message ?? "Periksa kembali isian kamu.",
        });
        return;
      }
      await new Promise<void>((resolve, reject) => {
        resetMutation.mutate(result.data, {
          onSuccess: () => {
            setDone(true);
            toast.success("Password berhasil direset", {
              description: "Silakan masuk dengan password baru kamu.",
            });
            resolve();
          },
          onError: (err) => {
            toast.error("Gagal reset password", {
              description: err.message ?? "Link mungkin sudah kadaluarsa.",
            });
            reject(err);
          },
        });
      });
    },
  });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="size-12 text-green-500" />
        <div>
          <p className="font-semibold text-gray-900">Password berhasil diubah</p>
          <p className="mt-1 text-sm text-gray-500">
            Sekarang kamu bisa masuk dengan password baru.
          </p>
        </div>
        <a
          className="bg-accent rounded-lg px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          href="/auth/login"
        >
          Masuk Sekarang
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
      {/* Password baru */}
      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => {
            const r = resetPasswordSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
          onChange: ({ value }) => {
            const r = resetPasswordSchema.shape.password.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Password tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="reset-password">Password Baru</Label>
            <div className="relative mt-1.5">
              <Input
                autoComplete="new-password"
                className="pr-10"
                id="reset-password"
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

      {/* Konfirmasi password — onDynamic + onChangeListenTo for cross-field */}
      <form.Field
        name="confirmPassword"
        validators={{
          onChangeListenTo: ["password"],
          onDynamic: ({ fieldApi }) =>
            zodFieldError(resetPasswordSchema, "confirmPassword", fieldApi.form.state.values),
          onBlur: ({ fieldApi }) =>
            zodFieldError(resetPasswordSchema, "confirmPassword", fieldApi.form.state.values),
          onChange: ({ fieldApi }) =>
            zodFieldError(resetPasswordSchema, "confirmPassword", fieldApi.form.state.values),
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="reset-confirm-password">Konfirmasi Password</Label>
            <Input
              autoComplete="new-password"
              className="mt-1.5"
              id="reset-confirm-password"
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
            disabled={isSubmitting || resetMutation.isPending}
            type="submit"
          >
            {isSubmitting || resetMutation.isPending ? "Menyimpan…" : "Simpan Password Baru"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

export default function ResetPasswordForm(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <ResetPasswordFormInner {...props} />
    </QueryClientProvider>
  );
}
