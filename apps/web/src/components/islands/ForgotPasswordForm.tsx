// =============================================================================
// ForgotPasswordForm — React island (client:load)
// Uses: TanStack Form v1, shadcn Input/Label/Button, sonner toasts
// Validation: revalidateLogic + zodValidator (form-level onDynamic)
// =============================================================================

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { forgotPasswordSchema } from "@repo/common/schemas";
import type { ForgotPasswordInput } from "@repo/common/schemas";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

import { queryClient } from "@/lib/query-client";
import { revalidateLogic, zodValidator } from "@/lib/form-validators";
import { useForgotPassword } from "@/hooks/mutations/useForgotPassword";

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

function ForgotPasswordFormInner() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const forgotMutation = useForgotPassword();
  const revalidate = revalidateLogic();

  const form = useForm<ForgotPasswordInput>({
    defaultValues: { email: "" },
    validators: {
      onDynamic: zodValidator(forgotPasswordSchema),
    },
    onSubmit: async ({ value }) => {
      await new Promise<void>((resolve, reject) => {
        forgotMutation.mutate(value, {
          onSuccess: () => {
            setSentEmail(value.email);
            setSent(true);
            toast.success("Email terkirim", {
              description: `Instruksi reset password dikirim ke ${value.email}`,
            });
            resolve();
          },
          onError: (err) => {
            toast.error("Gagal mengirim email", {
              description: err.message ?? "Terjadi kesalahan. Coba lagi.",
            });
            reject(err);
          },
        });
      });
    },
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="size-12 text-green-500" />
        <div>
          <p className="font-semibold text-gray-900">Cek email kamu</p>
          <p className="mt-1 text-sm text-gray-500">
            Kami mengirim link reset password ke{" "}
            <span className="font-medium text-gray-700">{sentEmail}</span>.
            Link berlaku 1 jam.
          </p>
        </div>
        <button
          className="text-accent text-sm hover:underline"
          onClick={() => {
            setSent(false);
            setSentEmail("");
            form.reset();
          }}
          type="button"
        >
          Kirim ulang ke email lain
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
      {/* Email — onBlur first, then onChange once touched */}
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const r = forgotPasswordSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
          onChange: ({ value }) => {
            const r = forgotPasswordSchema.shape.email.safeParse(value);
            return r.success ? undefined : (r.error.issues[0]?.message ?? "Email tidak valid");
          },
        }}
      >
        {(field) => (
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              autoComplete="email"
              className="mt-1.5"
              id="forgot-email"
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

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button
            className="bg-accent w-full py-5 text-sm font-semibold text-white hover:opacity-90"
            disabled={isSubmitting || forgotMutation.isPending}
            type="submit"
          >
            {isSubmitting || forgotMutation.isPending ? "Mengirim…" : "Kirim Link Reset"}
          </Button>
        )}
      </form.Subscribe>

      <p className="text-center text-sm text-gray-500">
        Ingat password kamu?{" "}
        <a className="text-accent font-medium hover:underline" href="/auth/login">
          Masuk
        </a>
      </p>
    </form>
  );
}

export default function ForgotPasswordForm() {
  return (
    <QueryClientProvider client={queryClient}>
      <ForgotPasswordFormInner />
    </QueryClientProvider>
  );
}
