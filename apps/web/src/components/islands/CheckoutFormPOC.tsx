// =============================================================================
// CheckoutFormPOC — ADR-001 metric island
//
// Purpose: Demonstrate checkout form layout using ONLY @repo/ui components.
// Used to measure: bundle size delta + TTFB vs production CheckoutForm.tsx.
// NOT for production use — see docs/ADR-001-fresh-vs-astro-checkout.md
// =============================================================================

import { useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";

export default function CheckoutFormPOC() {
  const [voucher, setVoucher] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-6 lg:col-span-2">
        {/* Shipping address */}
        <Card>
          <CardHeader>
            <CardTitle>Alamat Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="poc-name">Nama Penerima</Label>
                <Input id="poc-name" placeholder="Budi Santoso" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poc-phone">Nomor HP</Label>
                <Input id="poc-phone" placeholder="08123456789" type="tel" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poc-street">Alamat Lengkap</Label>
              <Input
                id="poc-street"
                placeholder="Jl. Sudirman No. 1, RT 01/RW 02"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="poc-city">Kota</Label>
                <Input id="poc-city" placeholder="Jakarta Selatan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poc-province">Provinsi</Label>
                <Input id="poc-province" placeholder="DKI Jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poc-postal">Kode Pos</Label>
                <Input id="poc-postal" placeholder="12190" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping method — static placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Pilih Pengiriman</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              Pilih alamat dengan data kota yang valid terlebih dahulu
            </p>
          </CardContent>
        </Card>

        {/* Voucher */}
        <Card>
          <CardHeader>
            <CardTitle>Voucher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                className="font-mono uppercase"
                onChange={e => setVoucher(e.target.value.toUpperCase())}
                placeholder="Kode voucher"
                value={voucher}
              />
              <Button type="button" variant="outline">
                Pakai
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Catatan (opsional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="focus:border-brand-500 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
              onChange={e => setNote(e.target.value)}
              placeholder="Pesan untuk penjual"
              rows={3}
              value={note}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column — order summary */}
      <div>
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Dummy item */}
            <div className="flex items-center gap-2 text-sm">
              <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">Produk Demo</p>
                <p className="text-xs text-gray-500">Varian A × 2</p>
              </div>
              <span className="text-xs font-semibold">Rp 200.000</span>
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>Rp 200.000</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Ongkir</span>
                <span>—</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>Rp 200.000</span>
              </div>
            </div>
            <Badge variant="secondary" className="w-full justify-center">
              🔒 Pembayaran aman via Midtrans
            </Badge>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg">
              Lanjut ke Pembayaran
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
