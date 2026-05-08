// =============================================================================
// CheckoutForm — React island, client:load
// Fetches real shipping rates from RajaOngkir via /shipping/rates
// =============================================================================

import { useStore } from "@nanostores/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";
import { $cart, $cartTotal, clearCart } from "@/stores/cart.store";

interface Address {
  city: string;
  cityId?: string;
  id: string;
  label: string;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  street: string;
}

interface ShippingRate {
  cost: number;
  description: string;
  etd: string;
  service: string;
}
interface CourierRates {
  courier: string;
  name: string;
  rates: ShippingRate[];
}
interface SelectedRate {
  cost: number;
  courier: string;
  etd: string;
  service: string;
}

interface Props {
  addresses: Address[];
  token: string;
  totalWeightGrams?: number;
}

export default function CheckoutForm({
  addresses,
  token,
  totalWeightGrams = 1000,
}: Props) {
  const cart = useStore($cart);
  const total = useStore($cartTotal);

  const [selectedAddress, setSelectedAddress] = useState(
    addresses[0]?.id ?? ""
  );
  const [shippingRates, setShippingRates] = useState<CourierRates[]>([]);
  const [selectedRate, setSelectedRate] = useState<SelectedRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherResult, setVoucherResult] = useState<{
    discountAmount: number;
    code: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discount = voucherResult?.discountAmount ?? 0;
  const grandTotal = Math.max(0, total + (selectedRate?.cost ?? 0) - discount);
  const currentAddress = addresses.find((a) => a.id === selectedAddress);

  const fetchRates = useCallback(
    async (cityId: string) => {
      setRatesLoading(true);
      setRatesError(null);
      setSelectedRate(null);
      setShippingRates([]);
      try {
        const res = await api.post<{ success: true; data: CourierRates[] }>(
          "/shipping/rates",
          { destinationCityId: cityId, weightGrams: totalWeightGrams }
        );
        setShippingRates(res.data);
      } catch {
        setRatesError("Gagal mengambil tarif ongkir. Coba lagi.");
      } finally {
        setRatesLoading(false);
      }
    },
    [totalWeightGrams]
  );

  useEffect(() => {
    const addr = addresses.find((a) => a.id === selectedAddress);
    if (addr?.cityId) {
      void fetchRates(addr.cityId);
    }
  }, [selectedAddress, fetchRates, addresses]);

  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) {
      return;
    }
    setVoucherError(null);
    try {
      const res = await api.post<{
        success: true;
        data: { code: string; discountAmount: number };
      }>(
        "/vouchers/validate",
        { code: voucherCode, orderAmount: total },
        { token }
      );
      setVoucherResult(res.data);
    } catch (err) {
      setVoucherError(
        err instanceof Error ? err.message : "Voucher tidak valid"
      );
      setVoucherResult(null);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      setError("Pilih alamat pengiriman");
      return;
    }
    if (!selectedRate) {
      setError("Pilih metode pengiriman");
      return;
    }
    if (cart.length === 0) {
      setError("Keranjang kosong");
      return;
    }
    if (!currentAddress?.cityId) {
      setError("Alamat tidak memiliki data kota");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const orderRes = await api.post<{ success: true; data: { id: string } }>(
        "/orders",
        {
          items: cart.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingAddressId: selectedAddress,
          destinationCityId: currentAddress.cityId,
          courier: selectedRate.courier,
          courierService: selectedRate.service,
          shippingCost: selectedRate.cost,
          voucherCode: voucherResult?.code,
          customerNote: note || undefined,
        },
        { token }
      );

      const orderId = orderRes.data.id;

      const paymentRes = await api.post<{
        success: true;
        data: { snapToken: string | null; snapRedirectUrl: string | null };
      }>("/payments", { orderId }, { token });

      const { snapToken, snapRedirectUrl } = paymentRes.data;

      if (snapToken && typeof window !== "undefined") {
        // @ts-expect-error
        window.snap?.pay(snapToken, {
          onSuccess: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=success`;
          },
          onPending: () => {
            clearCart();
            window.location.href = `/orders/${orderId}?status=pending`;
          },
          onError: () => setError("Pembayaran gagal. Silakan coba lagi."),
          onClose: () => {
            window.location.href = `/orders/${orderId}`;
          },
        });
      } else if (snapRedirectUrl) {
        clearCart();
        window.location.href = snapRedirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pesanan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
        <span className="text-6xl">🛒</span>
        <p>Keranjang kosong</p>
        <a
          className="font-medium text-accent text-sm hover:underline"
          href="/products"
        >
          Mulai belanja →
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Address selector */}
        <Section title="Alamat Pengiriman">
          {addresses.length === 0 ? (
            <div className="rounded-lg border-2 border-gray-200 border-dashed p-6 text-center">
              <svg
                className="mx-auto mb-3 h-8 w-8 text-gray-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mb-1 font-medium text-gray-600 text-sm">
                Belum ada alamat pengiriman
              </p>
              <p className="mb-4 text-gray-400 text-xs">
                Tambahkan alamat terlebih dahulu agar kamu bisa melanjutkan
                checkout
              </p>
              <a
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 font-semibold text-sm text-white transition-opacity hover:opacity-90"
                href="/profile/addresses"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 5v14m7-7H5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Tambah Alamat
              </a>
            </div>
          ) : (
            <>
              {addresses.map((addr) => (
                <label
                  className={`mb-3 flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                    selectedAddress === addr.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  key={addr.id}
                >
                  <input
                    checked={selectedAddress === addr.id}
                    className="mt-0.5 accent-brand-500"
                    name="address"
                    onChange={() => setSelectedAddress(addr.id)}
                    type="radio"
                    value={addr.id}
                  />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {addr.label} — {addr.recipientName}
                    </p>
                    <p className="text-gray-600">{addr.phone}</p>
                    <p className="text-gray-500">
                      {addr.street}, {addr.city}, {addr.province}{" "}
                      {addr.postalCode}
                    </p>
                    {!addr.cityId && (
                      <p className="mt-1 text-xs text-yellow-600">
                        ⚠ ID kota belum diset — ongkir tidak bisa dihitung
                      </p>
                    )}
                  </div>
                </label>
              ))}
              <a
                className="mt-1 flex items-center gap-1.5 font-medium text-gray-500 text-xs transition-colors hover:text-gray-800"
                href="/profile/addresses"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 5v14m7-7H5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Kelola atau tambah alamat lain
              </a>
            </>
          )}
        </Section>

        {/* Shipping rates */}
        <Section title="Pilih Pengiriman">
          {currentAddress?.cityId ? (
            ratesLoading ? (
              <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    fill="currentColor"
                  />
                </svg>
                Mengambil tarif ongkir…
              </div>
            ) : ratesError ? (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {ratesError}
                <button
                  className="ml-2 underline"
                  onClick={() =>
                    currentAddress?.cityId &&
                    void fetchRates(currentAddress.cityId)
                  }
                >
                  Coba lagi
                </button>
              </div>
            ) : shippingRates.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Tidak ada layanan tersedia untuk kota ini
              </p>
            ) : (
              shippingRates.map((group) => (
                <div className="mb-4" key={group.courier}>
                  <p className="mb-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                    {group.name}
                  </p>
                  {group.rates.map((rate) => {
                    const isSelected =
                      selectedRate?.courier === group.courier &&
                      selectedRate?.service === rate.service;
                    return (
                      <label
                        className={`mb-2 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-brand-500 bg-brand-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        key={rate.service}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            checked={isSelected}
                            className="accent-brand-500"
                            name="shipping"
                            onChange={() =>
                              setSelectedRate({
                                courier: group.courier,
                                service: rate.service,
                                cost: rate.cost,
                                etd: rate.etd,
                              })
                            }
                            type="radio"
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {rate.service} — {rate.description}
                            </p>
                            {rate.etd && (
                              <p className="text-gray-500 text-xs">
                                Estimasi {rate.etd} hari kerja
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatIDR(rate.cost)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))
            )
          ) : (
            <p className="text-gray-400 text-sm">
              Pilih alamat dengan data kota yang valid terlebih dahulu
            </p>
          )}
        </Section>

        {/* Voucher */}
        <Section title="Voucher">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case focus:border-brand-500"
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Kode voucher"
              type="text"
              value={voucherCode}
            />
            <button
              className="rounded-lg bg-gray-900 px-4 py-2.5 font-semibold text-sm text-white hover:bg-gray-700"
              onClick={() => void handleValidateVoucher()}
              type="button"
            >
              Pakai
            </button>
          </div>
          {voucherError && (
            <p className="mt-1.5 text-red-600 text-xs">{voucherError}</p>
          )}
          {voucherResult && (
            <p className="mt-1.5 font-medium text-green-600 text-xs">
              ✓ Hemat {formatIDR(voucherResult.discountAmount)}
            </p>
          )}
        </Section>

        {/* Notes */}
        <Section title="Catatan (opsional)">
          <textarea
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pesan untuk penjual"
            rows={3}
            value={note}
          />
        </Section>
      </div>

      {/* Order summary */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">
            Ringkasan Pesanan
          </h3>
          <ul className="mb-4 space-y-3 border-gray-100 border-b pb-4">
            {cart.map((item) => (
              <li
                className="flex items-center gap-2 text-sm"
                key={item.variantId}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-50">
                  {item.imageUrl ? (
                    <img
                      alt={item.productName}
                      className="h-full w-full object-cover"
                      src={item.imageUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      📦
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-xs">
                    {item.productName}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {item.variantName} × {item.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-xs">
                  {formatIDR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(total)} />
            <Row
              label="Ongkir"
              value={selectedRate ? formatIDR(selectedRate.cost) : "—"}
            />
            {discount > 0 && (
              <Row
                className="text-green-600"
                label="Diskon"
                value={`- ${formatIDR(discount)}`}
              />
            )}
            <div className="flex justify-between border-gray-100 border-t pt-2 font-bold text-base">
              <span>Total</span>
              <span className="text-accent">{formatIDR(grandTotal)}</span>
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700 text-xs">
              {error}
            </div>
          )}
          <button
            className="mt-4 w-full rounded-lg bg-accent py-3.5 font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !selectedRate}
            onClick={() => void handleCheckout()}
          >
            {isSubmitting ? "Memproses…" : `Bayar ${formatIDR(grandTotal)}`}
          </button>
          <p className="mt-2 text-center text-gray-400 text-xs">
            🔒 Pembayaran aman via Midtrans
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
