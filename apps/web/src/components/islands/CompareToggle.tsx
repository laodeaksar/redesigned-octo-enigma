import { useEffect, useState } from "react";
import {
  $compareIds,
  $compareList,
  addToCompare,
  hydrateCompare,
  MAX_COMPARE,
  removeFromCompare,
  type CompareProduct,
} from "@/stores/compare.store";
import { useStore } from "@nanostores/react";

interface Props {
  product: CompareProduct;
  size?: "sm" | "md";
}

export default function CompareToggle({ product, size = "sm" }: Props) {
  const ids = useStore($compareIds);
  const list = useStore($compareList);
  const [hydrated, setHydrated] = useState(false);
  const [flash, setFlash] = useState<"added" | "full" | null>(null);

  useEffect(() => {
    hydrateCompare();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  const active = ids.includes(product.id);
  const full = list.length >= MAX_COMPARE && !active;

  function toggle() {
    if (active) {
      removeFromCompare(product.id);
    } else {
      const ok = addToCompare(product);
      if (!ok) {
        setFlash("full");
        setTimeout(() => setFlash(null), 2000);
        return;
      }
      setFlash("added");
      setTimeout(() => setFlash(null), 1500);
    }
  }

  const isSmall = size === "sm";

  return (
    <div className="relative">
      <button
        className={`flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors ${isSmall ? "px-2 py-1" : "px-3 py-1.5"} ${
          active
            ? "bg-brand-500 hover:bg-brand-600 text-white"
            : full
              ? "cursor-not-allowed bg-gray-100 text-gray-400"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } `}
        disabled={full}
        onClick={toggle}
        title={
          active
            ? "Hapus dari perbandingan"
            : full
              ? `Maks. ${MAX_COMPARE} produk`
              : "Bandingkan produk ini"
        }
        type="button"
      >
        <svg
          className={isSmall ? "h-3 w-3" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          {active ? (
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {isSmall
          ? active
            ? "Dibandingkan"
            : "Bandingkan"
          : active
            ? "✓ Ditambahkan"
            : "Bandingkan"}
      </button>

      {flash === "full" && (
        <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1 text-xs whitespace-nowrap text-white shadow-lg">
          Maks. {MAX_COMPARE} produk
        </div>
      )}
    </div>
  );
}
