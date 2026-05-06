import { useEffect, useState } from "react";
import {
  $compareList,
  $compareIds,
  MAX_COMPARE,
  addToCompare,
  removeFromCompare,
  hydrateCompare,
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

  if (!hydrated) return null;

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
        type="button"
        onClick={toggle}
        disabled={full}
        title={
          active ? "Hapus dari perbandingan" :
          full ? `Maks. ${MAX_COMPARE} produk` :
          "Bandingkan produk ini"
        }
        className={`flex items-center gap-1.5 rounded-md transition-colors text-xs font-medium
          ${isSmall ? "px-2 py-1" : "px-3 py-1.5"}
          ${active
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : full
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }
        `}
      >
        <svg
          className={isSmall ? "h-3 w-3" : "h-4 w-4"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {active ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10m0-10a2 2 0 012 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          )}
        </svg>
        {isSmall ? (active ? "Dibandingkan" : "Bandingkan") : (active ? "✓ Ditambahkan" : "Bandingkan")}
      </button>

      {flash === "full" && (
        <div className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs text-white shadow-lg">
          Maks. {MAX_COMPARE} produk
        </div>
      )}
    </div>
  );
}
