// =============================================================================
// CheckoutForm — React island, client:load
// Fetches real shipping rates from RajaOngkir via /shipping/rates
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { $cart, $cartTotal, clearCart } from "@/stores/cart.store";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";

interface Address {
  id: string; label: string; recipientName: string; phone: string;
  street: string; city: string; province: string; postalCode: string;
  cityId?: string;
}

interface ShippingRate { service: string; description: string; cost: number; etd: string; }
interface CourierRates  { courier: string; name: string; rates: ShippingRate[]; }
interface SelectedRate  { courier: string; service: string; cost: number; etd: string; }

interface Props { addresses: Address[]; token: string; totalWeightGrams?: number; }

export default function CheckoutForm({ addresses, token, totalWeightGrams = 1000 }: Props) {
  const cart  = useStore($cart);
  const total = useStore($cartTotal);

  const [selectedAddress, setSelectedAddress] = useState(addresses[0]?.id ?? "");
  const [shippingRates, setShippingRates]     = useState<CourierRates[]>([]);
  const [selectedRate, setSelectedRate]       = useState<SelectedRate | null>(null);
  const [ratesLoading, setRatesLoading]       = useState(false);
  const [ratesError, setRatesError]           = useState<string | null>(null);

  const [voucherCode, setVoucherCode]       = useState("");
  const [voucherResult, setVoucherResult]   = useState<{ discountAmount: number; code: string } | null>(null);
  const [voucherError, setVoucherError]     = useState<string | null>(null);
  const [note, setNote]                     = useState("");
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const discount   = voucherResult?.discountAmount ?? 0;
  const grandTotal = Math.max(0, total + (selectedRate?.cost ?? 0) - discount);
  const currentAddress = addresses.find((a) => a.id === selectedAddress);

  const fetchRates = useCallback(async (cityId: string) => {
    setRatesLoading(true); setRatesError(null); setSelectedRate(null); setShippingRates([]);
    try {
      const res = await api.post<{ success: true; data: CourierRates[] }>(
        "/shipping/rates", { destinationCityId: cityId, weightGrams: totalWeightGrams }
      );
      setShippingRates(res.data);
    } catch { setRatesError("Gagal mengambil tarif ongkir. Coba lagi."); }
    finally  { setRatesLoading(false); }
  }, [totalWeightGrams]);

  useEffect(() => {
    const addr = addresses.find((a) => a.id === selectedAddress);
    if (addr?.cityId) void fetchRates(addr.cityId);
  }, [selectedAddress, fetchRates, addresses]);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherError(null);
    try {
      const res = await api.post<{ success: true; data: { code: string; discountAmount: number } }>(
        "/vouchers/validate", { code: voucherCode, orderAmount: total }, { token }
      );
      setVoucherResult(res.data);
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : "Voucher tidak valid");
      setVoucherResult(null);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress)       { setError("Pilih alamat pengiriman"); return; }
    if (!selectedRate)          { setError("Pilih metode pengiriman"); return; }
    if (cart.length === 0)      { setError("Keranjang kosong"); return; }
    if (!currentAddress?.cityId){ setError("Alamat tidak memiliki data kota"); return; }

    setIsSubmitting(true); setError(null);
    try {
      const orderRes = await api.post<{ success: true; data: { id: string } }>("/orders", {
        items: cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        shippingAddressId: selectedAddress,
        destinationCityId: currentAddress.cityId,
        courier:           selectedRate.courier,
        courierService:    selectedRate.service,
        shippingCost:      selectedRate.cost,
        voucherCode:       voucherResult?.code,
        customerNote:      note || undefined,
      }, { token });

      const orderId = orderRes.data.id;

      const paymentRes = await api.post<{
        success: true; data: { snapToken: string | null; snapRedirectUrl: string | null };
      }>("/payments", { orderId }, { token });

      const { snapToken, snapRedirectUrl } = paymentRes.data;

      if (snapToken && typeof window !== "undefined") {
        // @ts-ignore
        window.snap?.pay(snapToken, {
          onSuccess: () => { clearCart(); window.location.href = `/orders/${orderId}?status=success`; },
          onPending: () => { clearCart(); window.location.href = `/orders/${orderId}?status=pending`; },
          onError:   () => setError("Pembayaran gagal. Silakan coba lagi."),
          onClose:   () => { window.location.href = `/orders/${orderId}`; },
        });
      } else if (snapRedirectUrl) {
        clearCart(); window.location.href = snapRedirectUrl;
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Gagal membuat pesanan."); }
    finally       { setIsSubmitting(false); }
  };

  if (cart.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
      <span className="text-6xl">🛒</span><p>Keranjang kosong</p>
      <a href="/products" className="text-sm font-medium text-accent hover:underline">Mulai belanja →</a>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">

        {/* Address selector */}
        <Section title="Alamat Pengiriman">
          {addresses.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-500 mb-3">Belum ada alamat</p>
              <a href="/profile/addresses/new" className="text-sm font-medium text-accent hover:underline">+ Tambah Alamat</a>
            </div>
          ) : addresses.map((addr) => (
            <label key={addr.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 mb-3 transition-colors ${
              selectedAddress === addr.id ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
            }`}>
              <input type="radio" name="address" value={addr.id} checked={selectedAddress === addr.id}
                onChange={() => setSelectedAddress(addr.id)} className="mt-0.5 accent-brand-500" />
              <div className="text-sm">
                <p className="font-semibold">{addr.label} — {addr.recipientName}</p>
                <p className="text-gray-600">{addr.phone}</p>
                <p className="text-gray-500">{addr.street}, {addr.city}, {addr.province} {addr.postalCode}</p>
                {!addr.cityId && <p className="mt-1 text-xs text-yellow-600">⚠ ID kota belum diset — ongkir tidak bisa dihitung</p>}
              </div>
            </label>
          ))}
        </Section>

        {/* Shipping rates */}
        <Section title="Pilih Pengiriman">
          {!currentAddress?.cityId ? (
            <p className="text-sm text-gray-400">Pilih alamat dengan data kota yang valid terlebih dahulu</p>
          ) : ratesLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Mengambil tarif ongkir…
            </div>
          ) : ratesError ? (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {ratesError}
              <button onClick={() => currentAddress?.cityId && void fetchRates(currentAddress.cityId)} className="ml-2 underline">Coba lagi</button>
            </div>
          ) : shippingRates.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada layanan tersedia untuk kota ini</p>
          ) : shippingRates.map((group) => (
            <div key={group.courier} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{group.name}</p>
              {group.rates.map((rate) => {
                const isSelected = selectedRate?.courier === group.courier && selectedRate?.service === rate.service;
                return (
                  <label key={rate.service} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 mb-2 transition-colors ${
                    isSelected ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="shipping" checked={isSelected}
                        onChange={() => setSelectedRate({ courier: group.courier, service: rate.service, cost: rate.cost, etd: rate.etd })}
                        className="accent-brand-500" />
                      <div>
                        <p className="text-sm font-medium">{rate.service} — {rate.description}</p>
                        {rate.etd && <p className="text-xs text-gray-500">Estimasi {rate.etd} hari kerja</p>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatIDR(rate.cost)}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </Section>

        {/* Voucher */}
        <Section title="Voucher">
          <div className="flex gap-2">
            <input type="text" placeholder="Kode voucher" value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono uppercase outline-none focus:border-brand-500 placeholder:normal-case placeholder:font-sans" />
            <button type="button" onClick={() => void handleValidateVoucher()}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700">Pakai</button>
          </div>
          {voucherError  && <p className="mt-1.5 text-xs text-red-600">{voucherError}</p>}
          {voucherResult && <p className="mt-1.5 text-xs font-medium text-green-600">✓ Hemat {formatIDR(voucherResult.discountAmount)}</p>}
        </Section>

        {/* Notes */}
        <Section title="Catatan (opsional)">
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Pesan untuk penjual" rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
        </Section>
      </div>

      {/* Order summary */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Ringkasan Pesanan</h3>
          <ul className="mb-4 space-y-3 border-b border-gray-100 pb-4">
            {cart.map((item) => (
              <li key={item.variantId} className="flex items-center gap-2 text-sm">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.variantName} × {item.quantity}</p>
                </div>
                <span className="text-xs font-semibold shrink-0">{formatIDR(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(total)} />
            <Row label="Ongkir"   value={selectedRate ? formatIDR(selectedRate.cost) : "—"} />
            {discount > 0 && <Row label="Diskon" value={`- ${formatIDR(discount)}`} className="text-green-600" />}
            <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-base">
              <span>Total</span><span className="text-accent">{formatIDR(grandTotal)}</span>
            </div>
          </div>
          {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{error}</div>}
          <button onClick={() => void handleCheckout()} disabled={isSubmitting || !selectedRate}
            className="mt-4 w-full rounded-lg bg-accent py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Memproses…" : `Bayar ${formatIDR(grandTotal)}`}
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">🔒 Pembayaran aman via Midtrans</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"><h3 className="mb-4 font-semibold text-gray-900">{title}</h3>{children}</div>;
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className="flex items-center justify-between"><span className="text-gray-500">{label}</span><span className={className}>{value}</span></div>;
}

