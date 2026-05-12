// =============================================================================
// AddToCartButton — React island, client:load
//
// Migration: uses useAddToCart mutation (optimistic update) instead of the
// synchronous addToCart() store action.
//
// UI improvements:
//   - Quantity stepper → InputGroup + InputGroupButton (from @repo/ui)
//   - Attribute variant chips → ButtonGroup (from @repo/ui)
// =============================================================================

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";
import { useAddToCart } from "@/hooks/mutations/useAddToCart";
import { formatIDR } from "@/lib/utils";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Variant {
  attributes: Record<string, string>;
  compareAtPrice: number | null;
  id: string;
  isActive: boolean;
  name: string;
  price: number;
  stock: number;
}

interface Props {
  isLoggedIn?: boolean;
  primaryImage: string | null;
  productName: string;
  variants: Variant[];
}

// ── Inner component ───────────────────────────────────────────────────────────

function AddToCartButtonInner({
  productName,
  variants,
  primaryImage,
  isLoggedIn = false,
}: Props) {
  const { mutate: addToCart, isPending } = useAddToCart();

  const activeVariants = variants.filter(v => v.isActive);
  const attrKeys = Object.keys(activeVariants[0]?.attributes ?? {});

  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(
      attrKeys.map(k => [
        k,
        activeVariants[0]?.attributes[k] ?? "",
      ])
    )
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const matchedVariant = activeVariants.find(v =>
    attrKeys.every(k => v.attributes[k] === selected[k])
  );

  const isOutOfStock = !matchedVariant || matchedVariant.stock === 0;
  const maxQty = matchedVariant?.stock ?? 1;

  const attrValues = (key: string): string[] => [
    ...new Set(
      activeVariants.map(v => v.attributes[key]).filter(Boolean) as string[]
    ),
  ];

  const handleAdd = () => {
    if (!matchedVariant || isOutOfStock) return;

    addToCart(
      {
        item: {
          variantId: matchedVariant.id,
          productName,
          variantName: matchedVariant.name,
          sku: matchedVariant.id,
          imageUrl: primaryImage,
          price: matchedVariant.price,
          quantity: qty,
        },
        isLoggedIn,
      },
      {
        onSuccess: () => {
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Attribute selectors (ButtonGroup per attribute key) ──────────── */}
      {attrKeys.map(key => {
        const values = attrValues(key);
        return (
          <div key={key}>
            <p className="mb-2 text-sm font-medium text-gray-700 capitalize">
              {key}
              {selected[key] && (
                <span className="ml-1.5 font-normal text-gray-500">
                  : {selected[key]}
                </span>
              )}
            </p>

            {/* ButtonGroup fuses the buttons into a radio-chip strip */}
            <ButtonGroup>
              {values.map(val => {
                const isAvailable = activeVariants.some(
                  v => v.attributes[key] === val && v.stock > 0
                );
                const isActive = selected[key] === val;

                return (
                  <Button
                    className={
                      !isAvailable
                        ? "cursor-not-allowed opacity-40 line-through"
                        : ""
                    }
                    disabled={!isAvailable}
                    key={val}
                    onClick={() => setSelected(s => ({ ...s, [key]: val }))}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                  >
                    {val}
                  </Button>
                );
              })}
            </ButtonGroup>
          </div>
        );
      })}

      {/* ── Price ────────────────────────────────────────────────────────── */}
      {matchedVariant && (
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">
            {formatIDR(matchedVariant.price)}
          </span>
          {matchedVariant.compareAtPrice && (
            <span className="text-base text-gray-400 line-through">
              {formatIDR(matchedVariant.compareAtPrice)}
            </span>
          )}
        </div>
      )}

      {/* ── Low stock warning ─────────────────────────────────────────────── */}
      {matchedVariant && matchedVariant.stock > 0 && matchedVariant.stock <= 5 && (
        <p className="text-sm font-medium text-yellow-600">
          ⚡ Sisa {matchedVariant.stock} item
        </p>
      )}

      {/* ── Quantity stepper (InputGroup) ─────────────────────────────────── */}
      {!isOutOfStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Jumlah:</span>
          <InputGroup className="w-32">
            <InputGroupAddon align="inline-start">
              <InputGroupButton
                aria-label="Kurangi jumlah"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                size="icon-sm"
              >
                −
              </InputGroupButton>
            </InputGroupAddon>

            <InputGroupInput
              aria-label="Jumlah produk"
              className="text-center"
              max={maxQty}
              min={1}
              onChange={e => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setQty(Math.min(maxQty, Math.max(1, v)));
              }}
              type="number"
              value={qty}
            />

            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Tambah jumlah"
                onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                size="icon-sm"
              >
                +
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>

          {maxQty <= 5 && (
            <span className="text-xs text-gray-400">maks. {maxQty}</span>
          )}
        </div>
      )}

      {/* ── Add to cart CTA ───────────────────────────────────────────────── */}
      <Button
        className={`w-full text-sm font-semibold ${
          added ? "bg-green-500 hover:bg-green-500 text-white" : ""
        }`}
        disabled={isOutOfStock || isPending}
        onClick={handleAdd}
        size="lg"
        variant={isOutOfStock ? "outline" : added ? "default" : "default"}
      >
        {isOutOfStock
          ? "Stok Habis"
          : isPending
            ? "Menambahkan…"
            : added
              ? "✓ Ditambahkan ke Keranjang!"
              : "Tambah ke Keranjang"}
      </Button>
    </div>
  );
}

// ── Export (with QueryClientProvider) ─────────────────────────────────────────

export default function AddToCartButton(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AddToCartButtonInner {...props} />
    </QueryClientProvider>
  );
}
