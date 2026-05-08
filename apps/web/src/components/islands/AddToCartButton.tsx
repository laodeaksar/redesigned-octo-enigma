// =============================================================================
// AddToCartButton — React island, client:load
// =============================================================================

import { useState } from "react";
import { addToCart } from "@/stores/cart.store";

import { formatIDR } from "@/lib/utils";

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
  primaryImage: string | null;
  productName: string;
  variants: Variant[];
}

export default function AddToCartButton({
  productName,
  variants,
  primaryImage,
}: Props) {
  const activeVariants = variants.filter(v => v.isActive);

  // Group attribute keys for selector UI
  const attrKeys = Object.keys(activeVariants[0]?.attributes ?? {});

  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(
      attrKeys.map(k => [
        k,
        Object.values(activeVariants[0]?.attributes ?? {})[
          attrKeys.indexOf(k)
        ] ?? "",
      ])
    )
  );
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Find matching variant based on selected attributes
  const matchedVariant = activeVariants.find(v =>
    attrKeys.every(k => v.attributes[k] === selected[k])
  );

  const isOutOfStock = !matchedVariant || matchedVariant.stock === 0;
  const maxQty = matchedVariant?.stock ?? 0;

  // Get unique values per attribute key for the selector
  const attrValues = (key: string): string[] => [
    ...new Set(
      activeVariants.map(v => v.attributes[key]).filter(Boolean) as string[]
    ),
  ];

  const handleAdd = async () => {
    if (!matchedVariant || isOutOfStock) {
      return;
    }
    setAdding(true);

    addToCart({
      variantId: matchedVariant.id,
      productName,
      variantName: matchedVariant.name,
      sku: matchedVariant.id,
      imageUrl: primaryImage,
      price: matchedVariant.price,
      quantity: qty,
    });

    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Attribute selectors */}
      {attrKeys.map(key => (
        <div key={key}>
          <p className="mb-2 text-sm font-medium text-gray-700 capitalize">
            {key}
          </p>
          <div className="flex flex-wrap gap-2">
            {attrValues(key).map(val => {
              const isAvailable = activeVariants.some(
                v => v.attributes[key] === val && v.stock > 0
              );
              return (
                <button
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected[key] === val
                      ? "border-brand-500 bg-brand-500 text-white"
                      : isAvailable
                        ? "border-gray-200 text-gray-700 hover:border-gray-400"
                        : "cursor-not-allowed border-gray-100 text-gray-300 line-through"
                  }`}
                  disabled={!isAvailable}
                  key={val}
                  onClick={() => setSelected(s => ({ ...s, [key]: val }))}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Price */}
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

      {/* Stock indicator */}
      {matchedVariant &&
        matchedVariant.stock > 0 &&
        matchedVariant.stock <= 5 && (
          <p className="text-sm font-medium text-yellow-600">
            ⚡ Sisa {matchedVariant.stock} item
          </p>
        )}

      {/* Quantity */}
      {!isOutOfStock && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Jumlah:</span>
          <div className="flex items-center rounded-md border border-gray-200">
            <button
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50"
              onClick={() => setQty(q => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50"
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        className={`w-full rounded-lg py-3 text-sm font-semibold transition-all ${
          isOutOfStock
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : added
              ? "bg-green-500 text-white"
              : "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
        }`}
        disabled={isOutOfStock || adding}
        onClick={() => void handleAdd()}
      >
        {isOutOfStock
          ? "Stok Habis"
          : adding
            ? "Menambahkan…"
            : added
              ? "✓ Ditambahkan!"
              : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}
