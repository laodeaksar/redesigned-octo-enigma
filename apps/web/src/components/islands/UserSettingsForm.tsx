// =============================================================================
// UserSettingsForm — profile edit + security island
//
// Migration: ProfileTab uses TanStack Form v1 with local profileFormSchema
// (all-string fields so TanStack Form type inference works). Mapped to
// UpdateProfileInput in onSubmit. Errors shown per field.
// SecurityTab is unchanged (read-only except logout form).
// Toasts via notify from @/lib/toast (useUpdateUser emits them).
// =============================================================================

import { useForm } from "@tanstack/react-form";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";

import { queryClient } from "@/lib/query-client";
import { useUpdateUser } from "@/hooks/mutations/useUpdateUser";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";

// ── Form schema ───────────────────────────────────────────────────────────────

const profileFormSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100, "Nama terlalu panjang"),
  avatarUrl: z
    .string()
    .refine(
      v => v === "" || /^https?:\/\/.+/.test(v),
      "URL foto tidak valid (harus diawali https://)"
    ),
});

const nameFieldSchema = z
  .string()
  .min(2, "Nama minimal 2 karakter")
  .max(100, "Nama terlalu panjang");

const avatarUrlFieldSchema = z
  .string()
  .refine(
    v => v === "" || /^https?:\/\/.+/.test(v),
    "URL foto tidak valid (harus diawali https://)"
  );

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: string;
  status: string;
}

interface Props {
  user: User;
}

type Tab = "profile" | "security";

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return (
      <img
        alt={name}
        className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-md"
        src={avatarUrl}
      />
    );
  }
  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-2xl font-bold text-white ring-4 ring-white shadow-md">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function FieldError({ errors }: { errors: unknown[] }) {
  if (errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{String(errors[0])}</p>;
}

// ── Profile tab (TanStack Form) ───────────────────────────────────────────────

function ProfileTab({ user }: { user: User }) {
  const { mutateAsync: updateUser, isPending } = useUpdateUser();

  const form = useForm({
    defaultValues: {
      name: user.name,
      avatarUrl: user.avatarUrl ?? "",
    },
    onSubmit: async ({ value }) => {
      const parsed = profileFormSchema.safeParse(value);
      if (!parsed.success) return;
      await updateUser({
        name: parsed.data.name.trim() || undefined,
        avatarUrl: parsed.data.avatarUrl.trim() || null,
      });
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={e => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {/* Avatar preview */}
      <form.Subscribe selector={state => state.values.avatarUrl}>
        {avatarUrl => (
          <div className="flex items-center gap-4">
            <Avatar avatarUrl={avatarUrl || null} name={user.name} />
            <div>
              <p className="text-sm font-medium text-gray-900">Foto Profil</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Masukkan URL gambar (JPG, PNG, WebP)
              </p>
            </div>
          </div>
        )}
      </form.Subscribe>

      {/* Avatar URL field */}
      <form.Field
        name="avatarUrl"
        validators={{
          onChange: ({ value }) => {
            const r = avatarUrlFieldSchema.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {field => (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              URL Foto Profil
            </label>
            <input
              className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
              placeholder="https://example.com/foto.jpg (opsional)"
              type="url"
              value={field.state.value}
            />
            <FieldError
              errors={field.state.meta.isTouched ? field.state.meta.errors : []}
            />
          </div>
        )}
      </form.Field>

      {/* Name field */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            const r = nameFieldSchema.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {field => (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
              placeholder="Nama kamu"
              type="text"
              value={field.state.value}
            />
            <FieldError
              errors={field.state.meta.isTouched ? field.state.meta.errors : []}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe
        selector={state => ({ canSubmit: state.canSubmit, isDirty: state.isDirty })}
      >
        {({ canSubmit, isDirty }) => (
          <Button
            className="bg-brand-500 text-white hover:bg-brand-500/90 h-9 px-5 text-sm font-semibold"
            disabled={isPending || !canSubmit || !isDirty}
            type="submit"
          >
            {isPending ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

// ── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
        <div className="flex items-center gap-3">
          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
            disabled
            type="email"
            value={user.email}
          />
          {user.emailVerified ? (
            <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200">
              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  clipRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  fillRule="evenodd"
                />
              </svg>
              Terverifikasi
            </Badge>
          ) : (
            <Badge className="shrink-0 bg-yellow-100 text-yellow-700 border-yellow-200">
              Belum terverifikasi
            </Badge>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Email tidak dapat diubah. Hubungi dukungan jika perlu.
        </p>
      </div>

      <Separator />

      {/* Password */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
        <div className="flex items-center gap-3">
          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400"
            disabled
            type="password"
            value="••••••••••••"
          />
          <Button
            className="shrink-0"
            onClick={() => {
              window.location.href = `/auth/forgot-password?email=${encodeURIComponent(
                user.email
              )}`;
            }}
            type="button"
            variant="outline"
          >
            Ubah
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Klik "Ubah" untuk menerima email tautan reset password.
        </p>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
        <p className="mb-1 text-sm font-semibold text-red-700">Keluar dari Akun</p>
        <p className="mb-3 text-xs text-red-600">
          Semua sesi aktif akan diakhiri. Kamu harus masuk kembali setelahnya.
        </p>
        <form action="/api/auth/logout" method="post">
          <Button
            className="border-red-200 text-red-600 hover:bg-red-50 bg-white"
            type="submit"
            variant="outline"
          >
            Keluar Sekarang
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

function UserSettingsFormInner({ user }: Props) {
  const [active, setActive] = useState<Tab>("profile");

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Edit Profil" },
    { id: "security", label: "Keamanan" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-b-2 border-brand-500 text-brand-600"
                : "text-muted-foreground hover:text-gray-700"
            }`}
            key={tab.id}
            onClick={() => setActive(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "profile" && <ProfileTab user={user} />}
      {active === "security" && <SecurityTab user={user} />}
    </div>
  );
}

export default function UserSettingsForm(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserSettingsFormInner {...props} />
    </QueryClientProvider>
  );
}
