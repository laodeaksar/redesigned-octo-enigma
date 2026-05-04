// =============================================================================
// Product detail page
// =============================================================================

import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, ImageOff, Tag, Layers } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { api, type ApiResponse } from "@/lib/api";
import { formatIDR, formatDate, cn } from "@/lib/utils";
import { productKeys } from "./index";

export const Route = createFileRoute("/_admin/products/$productId")({
  component: ProductDetailPage,
});

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  status: "active" | "draft" | "archived";
  tags: string[];
  weight: number | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    attributes: Record<string, string>;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    isActive: boolean;
  }>;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
}

const STATUS_LABELS = {
  active: { label: "Aktif", class: "bg-green-100 text-green-800" },
  draft: { label: "Draft", class: "bg-yellow-100 text-yellow-800" },
  archived: { label: "Arsip", class: "bg-muted text-muted-foreground" },
};

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () =>
      api.get<ApiResponse<ProductDetail>>(`/products/${productId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.patch(`/products/${productId}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: ["products", "list"] });
    },
  });

  const product = data?.data;
  const statusCfg = product ? STATUS_LABELS[product.status] : null;

  if (isLoading) {
    return (
      <AdminLayout title="Produk">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-2 text-sm">Memuat produk…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminLayout title="Produk">
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <p>Produk tidak ditemukan.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Detail Produk">
      <PageHeader
        title={product.name}
        breadcrumbs={[
          { label: "Produk", href: "/_admin/products/" },
          { label: product.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Status toggle */}
            <select
              value={product.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Aktif</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip</option>
            </select>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Images */}
          <Section title="Gambar Produk" icon={ImageOff}>
            {product.images.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada gambar.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {product.images
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.url}
                        alt={img.altText ?? product.name}
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Utama
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </Section>

          {/* Variants */}
          <Section title="Varian" icon={Layers}>
            {product.variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada varian.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 font-medium">Nama</th>
                      <th className="pb-2 font-medium">Harga</th>
                      <th className="pb-2 font-medium">Stok</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {product.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 font-mono text-xs">{v.sku}</td>
                        <td className="py-2.5">{v.name}</td>
                        <td className="py-2.5">
                          <div>
                            <span className="font-medium">{formatIDR(v.price)}</span>
                            {v.compareAtPrice && (
                              <span className="ml-1.5 text-xs text-muted-foreground line-through">
                                {formatIDR(v.compareAtPrice)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "font-medium",
                              v.stock === 0
                                ? "text-destructive"
                                : v.stock <= 5
                                  ? "text-yellow-600"
                                  : ""
                            )}
                          >
                            {v.stock}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              v.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {v.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Right column — metadata */}
        <div className="space-y-6">
          <Section title="Info Produk" icon={Package}>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Status">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    statusCfg?.class
                  )}
                >
                  {statusCfg?.label}
                </span>
              </InfoRow>
              <InfoRow label="Kategori">
                {product.category?.name ?? "—"}
              </InfoRow>
              <InfoRow label="Berat">
                {product.weight ? `${product.weight}g` : "—"}
              </InfoRow>
              <InfoRow label="Dibuat">{formatDate(product.createdAt)}</InfoRow>
              <InfoRow label="Diperbarui">
                {formatDate(product.updatedAt)}
              </InfoRow>
            </dl>
          </Section>

          <Section title="Tags" icon={Tag}>
            {product.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada tag.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Deskripsi">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.shortDescription ?? product.description}
            </p>
          </Section>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
