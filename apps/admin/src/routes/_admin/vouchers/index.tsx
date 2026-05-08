// =============================================================================
// Vouchers list page — admin voucher management
// =============================================================================

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import { cn, formatDate, formatIDR } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";

export const Route = createFileRoute("/_admin/vouchers/")({
  component: VouchersPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Voucher {
  code: string;
  createdAt: string;
  description: string | null;
  expiresAt: string | null;
  id: string;
  isActive: boolean;
  maximumDiscountAmount: number | null;
  minimumOrderAmount: number;
  perUserLimit: number;
  startsAt: string | null;
  type: "percentage" | "fixed_amount" | "free_shipping";
  usageCount: number;
  usageLimit: number | null;
  value: number;
}

interface ApiResponse<T> {
  data: T;
  success: true;
}

const TYPE_LABELS: Record<string, string> = {
  percentage: "Persentase",
  fixed_amount: "Nominal Tetap",
  free_shipping: "Gratis Ongkir",
};

// ── Component ─────────────────────────────────────────────────────────────────

function VouchersPage() {
  const queryClient = useQueryClient();

  // Dialog state
  const [formDialog, setFormDialog] = useState<{
    mode: "create" | "edit";
    voucher?: Voucher;
  } | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percentage" as Voucher["type"],
    value: 0,
    minimumOrderAmount: 0,
    maximumDiscountAmount: "",
    usageLimit: "",
    perUserLimit: 1,
    isActive: true,
    startsAt: "",
    expiresAt: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["vouchers", "list"],
    queryFn: () => api.get<ApiResponse<Voucher[]>>("/vouchers"),
  });

  const vouchers = data?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/vouchers", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      setFormDialog(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/vouchers/${id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      setFormDialog(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vouchers/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/vouchers/${id}`, { isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vouchers"] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({
      code: "",
      description: "",
      type: "percentage",
      value: 0,
      minimumOrderAmount: 0,
      maximumDiscountAmount: "",
      usageLimit: "",
      perUserLimit: 1,
      isActive: true,
      startsAt: "",
      expiresAt: "",
    });
    setFormDialog({ mode: "create" });
  }

  function openEdit(voucher: Voucher) {
    setForm({
      code: voucher.code,
      description: voucher.description ?? "",
      type: voucher.type,
      value: voucher.value,
      minimumOrderAmount: voucher.minimumOrderAmount,
      maximumDiscountAmount: voucher.maximumDiscountAmount?.toString() ?? "",
      usageLimit: voucher.usageLimit?.toString() ?? "",
      perUserLimit: voucher.perUserLimit,
      isActive: voucher.isActive,
      startsAt: voucher.startsAt ? voucher.startsAt.slice(0, 16) : "",
      expiresAt: voucher.expiresAt ? voucher.expiresAt.slice(0, 16) : "",
    });
    setFormDialog({ mode: "edit", voucher });
  }

  function handleSubmit() {
    const body: Record<string, unknown> = {
      code: form.code.toUpperCase(),
      description: form.description || undefined,
      type: form.type,
      value: form.value,
      minimumOrderAmount: form.minimumOrderAmount,
      maximumDiscountAmount: form.maximumDiscountAmount
        ? Number(form.maximumDiscountAmount)
        : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      perUserLimit: form.perUserLimit,
      isActive: form.isActive,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    if (formDialog?.mode === "edit" && formDialog.voucher) {
      updateMutation.mutate({ id: formDialog.voucher.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function formatValue(voucher: Voucher) {
    if (voucher.type === "percentage") {
      return `${voucher.value}%`;
    }
    if (voucher.type === "fixed_amount") {
      return formatIDR(voucher.value);
    }
    return "Gratis Ongkir";
  }

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: Column<Voucher>[] = [
    {
      key: "code",
      header: "Kode",
      cell: row => (
        <span className="text-foreground font-mono text-sm font-semibold">
          {row.code}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipe",
      cell: row => (
        <div>
          <span className="text-sm">{TYPE_LABELS[row.type]}</span>
          <p className="text-muted-foreground text-xs font-semibold">
            {formatValue(row)}
          </p>
        </div>
      ),
    },
    {
      key: "usage",
      header: "Pemakaian",
      cell: row => (
        <span className="text-muted-foreground text-sm">
          {row.usageCount}
          {row.usageLimit ? ` / ${row.usageLimit}` : ""}
        </span>
      ),
    },
    {
      key: "validity",
      header: "Berlaku",
      cell: row => (
        <div className="text-muted-foreground text-xs">
          {row.startsAt && <p>Dari {formatDate(row.startsAt)}</p>}
          {row.expiresAt ? (
            <p>S/d {formatDate(row.expiresAt)}</p>
          ) : (
            <p>Tidak ada batas</p>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Aktif",
      cell: row => (
        <button
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            row.isActive
              ? "text-green-600 hover:text-green-700"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() =>
            toggleActiveMutation.mutate({ id: row.id, isActive: !row.isActive })
          }
          title={row.isActive ? "Nonaktifkan" : "Aktifkan"}
        >
          {row.isActive ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
          {row.isActive ? "Aktif" : "Nonaktif"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: row => (
        <div className="flex items-center gap-1">
          <button
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            onClick={() => openEdit(row)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="text-destructive hover:bg-destructive/10 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm(`Hapus voucher "${row.code}"?`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Voucher">
      <PageHeader
        actions={
          <button
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Buat Voucher
          </button>
        }
        description={`${vouchers.length} voucher terdaftar`}
        title="Voucher"
      />

      <DataTable
        columns={columns}
        data={vouchers}
        emptyMessage="Belum ada voucher"
        getRowKey={row => row.id}
        isLoading={isLoading}
      />

      {/* ── Form Dialog ───────────────────────────────────────────────────────── */}
      {formDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="border-border bg-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6 shadow-xl">
            <h3 className="text-foreground mb-4 text-base font-semibold">
              {formDialog.mode === "create"
                ? "Buat Voucher Baru"
                : "Edit Voucher"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Kode *
                  </label>
                  <input
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm uppercase focus:outline-none focus:ring-2 disabled:opacity-60"
                    disabled={formDialog.mode === "edit"}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="DISKON10"
                    value={form.code}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Tipe *
                  </label>
                  <select
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        type: e.target.value as Voucher["type"],
                      }))
                    }
                    value={form.type}
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed_amount">Nominal Tetap (Rp)</option>
                    <option value="free_shipping">Gratis Ongkir</option>
                  </select>
                </div>
              </div>

              {form.type !== "free_shipping" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-foreground mb-1 block text-sm font-medium">
                      Nilai {form.type === "percentage" ? "(%)" : "(Rp)"} *
                    </label>
                    <input
                      className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                      min={0}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          value: Number(e.target.value),
                        }))
                      }
                      type="number"
                      value={form.value}
                    />
                  </div>
                  {form.type === "percentage" && (
                    <div>
                      <label className="text-foreground mb-1 block text-sm font-medium">
                        Maks. Diskon (Rp)
                      </label>
                      <input
                        className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                        min={0}
                        onChange={e =>
                          setForm(f => ({
                            ...f,
                            maximumDiscountAmount: e.target.value,
                          }))
                        }
                        placeholder="Kosongkan = tidak ada batas"
                        type="number"
                        value={form.maximumDiscountAmount}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-foreground mb-1 block text-sm font-medium">
                  Deskripsi
                </label>
                <input
                  className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Opsional"
                  value={form.description}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Min. Pembelian (Rp)
                  </label>
                  <input
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                    min={0}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        minimumOrderAmount: Number(e.target.value),
                      }))
                    }
                    type="number"
                    value={form.minimumOrderAmount}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Maks. Pemakaian Total
                  </label>
                  <input
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                    min={1}
                    onChange={e =>
                      setForm(f => ({ ...f, usageLimit: e.target.value }))
                    }
                    placeholder="Kosongkan = tak terbatas"
                    type="number"
                    value={form.usageLimit}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Berlaku Mulai
                  </label>
                  <input
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                    onChange={e =>
                      setForm(f => ({ ...f, startsAt: e.target.value }))
                    }
                    type="datetime-local"
                    value={form.startsAt}
                  />
                </div>
                <div>
                  <label className="text-foreground mb-1 block text-sm font-medium">
                    Berakhir
                  </label>
                  <input
                    className="border-input bg-background focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2"
                    onChange={e =>
                      setForm(f => ({ ...f, expiresAt: e.target.value }))
                    }
                    type="datetime-local"
                    value={form.expiresAt}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  checked={form.isActive}
                  className="border-input h-4 w-4 rounded"
                  id="isActive"
                  onChange={e =>
                    setForm(f => ({ ...f, isActive: e.target.checked }))
                  }
                  type="checkbox"
                />
                <label
                  className="text-foreground text-sm font-medium"
                  htmlFor="isActive"
                >
                  Voucher aktif
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="border-input text-foreground hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium transition-colors"
                onClick={() => setFormDialog(null)}
              >
                Batal
              </button>
              <button
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !form.code}
                onClick={handleSubmit}
              >
                {isSaving
                  ? "Menyimpan..."
                  : formDialog.mode === "create"
                    ? "Buat Voucher"
                    : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
