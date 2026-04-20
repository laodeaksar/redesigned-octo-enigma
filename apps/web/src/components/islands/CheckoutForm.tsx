// =============================================================================
// CheckoutForm — React island, client:load
// =============================================================================

import React, { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $cart, $cartTotal, clearCart } from "@/stores/cart.store";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";

interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
}

interface Props {
  addresses: Address[];
  token: string;
}

const COURIERS = [
  { value: "jne", label: "JNE" },
  { value: "jnt", label: "J&T Express" },
  { value: "sicepat", label: "SiCepat" },
  { value: "anteraja", label: "AnterAja" },
];

const SERVICES = [
  { value: "REG", label: "Reguler (2-3 hari)" },
  { value: "YES", label: "Yakin Esok Sampai (1 hari)" },
  { value: "OKE", label: "Oke (3-5 hari)" },
];

export default function CheckoutForm({ addresses, token }: Props) {
  const cart = useStore($cart);
  const total = useStore($cartTotal);

  const [selectedAddress, setSelectedAddress] = useState(addresses[0]?.id ?? "");
  const [courier, setCourier] = useState("jne");
  const [service, setService] = useState("REG");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherResult, setVoucherResult] = useState<{ discountAmount: number; code: string } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shippingCost = 15_000; // placeholder flat rate
  const discount = voucherResult?.discountAmount ?? 0;
  const grandTotal = Math.max(0, total + shippingCost - discount);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError(null);

    try {
      const res = await api.post<{
        success: true;
        data: { code: string; discountAmount: number };
      }>("/vouchers/validate", { code: voucherCode, orderAmount: total }, { token });

      setVoucherResult(res.data);
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : "Voucher tidak valid");
      setVoucherResult(null);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      setError("Pilih alamat pengiriman terlebih dahulu");
      return;
    }
    if (cart.length === 0) {
      setError("Keranjang kosong");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create order
      const orderRes = await api.post<{
        success: true;
        data: { id: string; grandTotal: number; orderNumber: string };
      }>("/orders", {
        items: cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        shippingAddressId: selectedAddress,
        courier,
        courierService: service,
        voucherCode: voucherResult?.code ?? undefined,
        customerNote: note || undefined,
      }, { token });

      const orderId = orderRes.data.id;

      // 2. Create payment
      const paymentRes = await api.post<{
        success: true;
        data: { snapToken: string | null; snapRedirectUrl: string | null };
      }>("/payments", { orderId }, { token });

      const { snapToken, snapRedirectUrl } = paymentRes.data;

      // 3. Open Midtrans Snap popup
      if (snapToken && typeof window !== "undefined") {
        // @ts-ignore — Snap is loaded via CDN script tag
        window.snap?.pay(snapToken, {
          onSuccess: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=success`;
          },
          onPending: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=pending`;
          },
          onError: () => {
            setError("Pembayaran gagal. Silakan coba lagi.");
          },
          onClose: () => {
            // User closed the popup — redirect to order page
            window.location.href = `/orders/${orderId}`;
          },
        });
      } else if (snapRedirectUrl) {
        // Fallback: redirect to hosted payment page
        clearCart();
        window.location.href = snapRedirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
        <span className="text-6xl">🛒</span>
        <p>Keranjang kosong</p>
        <a href="/products" className="text-sm font-medium text-accent hover:underline">
          Mulai belanja →
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left — form */}
      <div className="space-y-6 lg:col-span-2">

        {/* Shipping address */}
        <Section title="Alamat Pengiriman">
          {addresses.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500 mb-3">Belum ada alamat tersimpan</p>
              <a href="/profile/addresses/new" className="text-sm font-medium text-accent hover:underline">
                + Tambah Alamat
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                    selectedAddress === addr.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddress === addr.id}
                    onChange={() => setSelectedAddress(addr.id)}
                    className="mt-0.5 accent-brand-500"
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      {addr.label} — {addr.recipientName}
                    </p>
                    <p className="text-gray-600">{addr.phone}</p>
                    <p className="text-gray-500">
                      {addr.street}, {addr.city}, {addr.province} {addr.postalCode}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Section>

        {/* Courier */}
        <Section title="Pengiriman">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Kurir</label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              >
                {COURIERS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Layanan</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              >
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Voucher */}
        <Section title="Voucher">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Kode voucher"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-500 uppercase placeholder:normal-case placeholder:font-sans"
            />
            <button
              type="button"
              onClick={() => void handleValidateVoucher()}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Pakai
            </button>
          </div>
          {voucherError && (
            <p className="mt-1.5 text-xs text-red-600">{voucherError}</p>
          )}
          {voucherResult && (
            <p className="mt-1.5 text-xs font-medium text-green-600">
              ✓ Hemat {formatIDR(voucherResult.discountAmount)}
            </p>
          )}
        </Section>

        {/* Notes */}
        <Section title="Catatan (opsional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pesan untuk penjual (warna, ukuran spesifik, dll)"
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </Section>
      </div>

      {/* Right — summary */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Ringkasan Pesanan</h3>

          {/* Items */}
          <ul className="mb-4 space-y-3 border-b border-gray-100 pb-4">
            {cart.map((item) => (
              <li key={item.variantId} className="flex items-center gap-2 text-sm">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.variantName} × {item.quantity}</p>
                </div>
                <span className="text-xs font-semibold shrink-0">{formatIDR(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(total)} />
            <Row label="Ongkir" value={formatIDR(shippingCost)} />
            {discount > 0 && (
              <Row label="Diskon" value={`- ${formatIDR(discount)}`} className="text-green-600" />
            )}
            <div className="flex items-center justify-between border-t border-gray-100 pt-2 font-bold text-base">
              <span>Total</span>
              <span className="text-accent">{formatIDR(grandTotal)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={() => void handleCheckout()}
            disabled={isSubmitting || cart.length === 0}
            className="mt-4 w-full rounded-lg bg-accent py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Memproses…" : `Bayar ${formatIDR(grandTotal)}`}
          </button>

          <p className="mt-2 text-center text-xs text-gray-400">
            🔒 Pembayaran aman via Midtrans
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

