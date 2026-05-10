// =============================================================================
// UserSettingsForm — profile edit + security island using @repo/ui (client:load)
// =============================================================================

import { useState } from "react";
import type React from "react";

import { api } from "@/lib/api";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";

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
  token: string;
  user: User;
}

type Tab = "profile" | "security";

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
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

// ── Alert helpers ─────────────────────────────────────────────────────────────

function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <svg
        className="h-4 w-4 shrink-0 text-green-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {message}
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <svg
        className="h-4 w-4 shrink-0 text-red-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {message}
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ user, token }: { user: User; token: string }) {
  const [name, setName]           = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const dirty =
    name.trim() !== user.name ||
    (avatarUrl.trim() || null) !== user.avatarUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      await api.patch(
        "/users/me",
        { name: name.trim() || undefined, avatarUrl: avatarUrl.trim() || null },
        { token }
      );
      setSuccess("Profil berhasil diperbarui!");
      setTimeout(() => window.location.reload(), 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={e => void handleSubmit(e)}>
      {success && <SuccessAlert message={success} />}
      {error   && <ErrorAlert message={error} />}

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar avatarUrl={avatarUrl || null} name={name || user.name} />
        <div>
          <p className="text-sm font-medium text-gray-900">Foto Profil</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Masukkan URL gambar (JPG, PNG, WebP)
          </p>
        </div>
      </div>

      {/* Avatar URL */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          URL Foto Profil
        </label>
        <input
          className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
          onChange={e => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/foto.jpg (opsional)"
          type="url"
          value={avatarUrl}
        />
      </div>

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          className="focus:border-brand-500 focus:ring-brand-500/10 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2"
          minLength={2}
          onChange={e => setName(e.target.value)}
          placeholder="Nama kamu"
          required
          type="text"
          value={name}
        />
      </div>

      <Button
        className="bg-brand-500 text-white hover:bg-brand-500/90 h-9 px-5 text-sm font-semibold"
        disabled={loading || !dirty}
        type="submit"
      >
        {loading ? "Menyimpan…" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab({ user }: { user: User }) {
  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Email
        </label>
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
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Password
        </label>
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
              window.location.href = `/auth/forgot-password?email=${encodeURIComponent(user.email)}`;
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

export default function UserSettingsForm({ user, token }: Props) {
  const [active, setActive] = useState<Tab>("profile");

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile",  label: "Edit Profil" },
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

      {active === "profile"  && <ProfileTab  token={token} user={user} />}
      {active === "security" && <SecurityTab user={user} />}
    </div>
  );
}
