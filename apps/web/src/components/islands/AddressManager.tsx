// =============================================================================
// AddressManager — React island for managing shipping addresses
// Supports: list, add, edit, delete, city autocomplete (RajaOngkir)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  cityId: string | null;
  isDefault: boolean;
}

interface City {
  id: string;
  name: string;
  type: string;
  province: string;
  postalCode: string;
}

interface FormState {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  cityId: string;
  isDefault: boolean;
}

interface Props {
  initialAddresses: Address[];
  token: string;
}

const EMPTY_FORM: FormState = {
  label: "",
  recipientName: "",
  phone: "",
  street: "",
  city: "",
  province: "",
  postalCode: "",
  cityId: "",
  isDefault: false,
};

// ── City search autocomplete ──────────────────────────────────────────────────

function CitySearch({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (city: City) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await api.get<{ success: true; data: City[] }>(
        "/shipping/cities",
        { params: { q } }
      );
      setResults(res.data.slice(0, 8));
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void search(q), 320);
  }

  function handleSelect(city: City) {
    const displayName = `${city.type} ${city.name}`;
    setQuery(displayName);
    onChange(displayName);
    onSelect(city);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Cari kota atau kabupaten…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 pr-8"
        />
        {loading && (
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg overflow-hidden">
          {results.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(city)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex justify-between items-center gap-2"
              >
                <span className="font-medium text-gray-900">
                  {city.type} {city.name}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {city.province} · {city.postalCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Address form ──────────────────────────────────────────────────────────────

function AddressForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: {
  initial: FormState;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<FormState>(initial);

  function set(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCitySelect(city: City) {
    setForm((prev) => ({
      ...prev,
      cityId: city.id,
      city: `${city.type} ${city.name}`,
      province: city.province,
      postalCode: city.postalCode,
    }));
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Row: label + recipientName */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Label <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="cth: Rumah, Kantor"
            maxLength={50}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Nama Penerima <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.recipientName}
            onChange={(e) => set("recipientName", e.target.value)}
            placeholder="Nama lengkap"
            maxLength={100}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          No. HP <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="0812xxxxxxxx"
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
        />
      </div>

      {/* Street */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Alamat Lengkap <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.street}
          onChange={(e) => set("street", e.target.value)}
          placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
          rows={3}
          required
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
        />
      </div>

      {/* City search */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Kota / Kabupaten <span className="text-red-500">*</span>
        </label>
        <CitySearch
          value={form.city}
          onChange={(val) => set("city", val)}
          onSelect={handleCitySelect}
        />
        {form.cityId && (
          <p className="mt-1 text-xs text-gray-400">
            ID Kota: {form.cityId} · {form.province} · {form.postalCode}
          </p>
        )}
      </div>

      {/* Province + Postal Code (auto-filled, still editable) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Provinsi <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.province}
            onChange={(e) => set("province", e.target.value)}
            placeholder="Auto-isi dari kota"
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 bg-gray-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Kode Pos <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            placeholder="5 digit"
            maxLength={5}
            pattern="\d{5}"
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 bg-gray-50"
          />
        </div>
      </div>

      {/* Default checkbox */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-gray-900"
        />
        <span className="text-gray-700">Jadikan alamat utama</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Menyimpan…" : "Simpan Alamat"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

// ── Address card ──────────────────────────────────────────────────────────────

function AddressCard({
  address,
  onEdit,
  onDelete,
  deleting,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className={`relative rounded-xl border p-4 transition-colors ${address.isDefault ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}`}>
      {address.isDefault && (
        <span className="absolute right-3 top-3 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Utama
        </span>
      )}
      <p className="mb-1 text-sm font-semibold text-gray-900">
        {address.label} — {address.recipientName}
      </p>
      <p className="text-sm text-gray-500">{address.phone}</p>
      <p className="mt-1 text-sm text-gray-600 leading-snug">
        {address.street}, {address.city}, {address.province} {address.postalCode}
      </p>
      {!address.cityId && (
        <p className="mt-1.5 text-xs text-amber-600">
          ⚠ ID kota belum diset — ongkir tidak bisa dihitung saat checkout
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onEdit}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Menghapus…" : "Hapus"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AddressManager({ initialAddresses, token }: Props) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async function handleCreate(data: FormState) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<{ success: true; data: Address }>(
        "/users/me/addresses",
        {
          label: data.label,
          recipientName: data.recipientName,
          phone: data.phone,
          street: data.street,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          cityId: data.cityId || undefined,
          isDefault: data.isDefault,
        },
        { token }
      );
      // If new address is default, clear default flag on others
      setAddresses((prev) => {
        const updated = data.isDefault
          ? prev.map((a) => ({ ...a, isDefault: false }))
          : prev;
        return [res.data, ...updated];
      });
      setMode("list");
      showToast("Alamat berhasil ditambahkan");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambah alamat");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async function handleUpdate(data: FormState) {
    if (!editTarget) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.patch<{ success: true; data: Address }>(
        `/users/me/addresses/${editTarget.id}`,
        {
          label: data.label,
          recipientName: data.recipientName,
          phone: data.phone,
          street: data.street,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
          cityId: data.cityId || undefined,
          isDefault: data.isDefault,
        },
        { token }
      );
      setAddresses((prev) => {
        const updated = data.isDefault
          ? prev.map((a) => ({ ...a, isDefault: a.id === editTarget.id ? false : false }))
          : prev;
        return updated.map((a) => (a.id === editTarget.id ? res.data : a));
      });
      setMode("list");
      setEditTarget(null);
      showToast("Alamat berhasil diperbarui");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memperbarui alamat");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Hapus alamat ini?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/me/addresses/${id}`, { token });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast("Alamat berhasil dihapus");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus alamat");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function startEdit(address: Address) {
    setEditTarget(address);
    setFormError(null);
    setMode("edit");
  }

  function startAdd() {
    setEditTarget(null);
    setFormError(null);
    setMode("add");
  }

  function cancelForm() {
    setMode("list");
    setEditTarget(null);
    setFormError(null);
  }

  function buildInitialForm(address: Address | null): FormState {
    if (!address) return EMPTY_FORM;
    return {
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      cityId: address.cityId ?? "",
      isDefault: address.isDefault,
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg animate-fade-in">
          ✓ {toast}
        </div>
      )}

      {/* ── List view ── */}
      {mode === "list" && (
        <>
          {addresses.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-sm font-medium text-gray-500">Belum ada alamat tersimpan</p>
              <p className="mt-1 text-xs text-gray-400">Tambah alamat untuk mempermudah checkout</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={() => startEdit(address)}
                  onDelete={() => void handleDelete(address.id)}
                  deleting={deletingId === address.id}
                />
              ))}
            </div>
          )}

          <button
            onClick={startAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
            Tambah Alamat Baru
          </button>
        </>
      )}

      {/* ── Add form ── */}
      {mode === "add" && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Tambah Alamat Baru</h2>
          <AddressForm
            initial={EMPTY_FORM}
            onSubmit={(data) => void handleCreate(data)}
            onCancel={cancelForm}
            loading={submitting}
            error={formError}
          />
        </div>
      )}

      {/* ── Edit form ── */}
      {mode === "edit" && editTarget && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Edit Alamat</h2>
          <AddressForm
            initial={buildInitialForm(editTarget)}
            onSubmit={(data) => void handleUpdate(data)}
            onCancel={cancelForm}
            loading={submitting}
            error={formError}
          />
        </div>
      )}

      {/* Link back to checkout */}
      {mode === "list" && addresses.length > 0 && (
        <div className="pt-2 text-center">
          <a
            href="/checkout"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline transition-colors"
          >
            Lanjut ke Checkout →
          </a>
        </div>
      )}
    </div>
  );
}
