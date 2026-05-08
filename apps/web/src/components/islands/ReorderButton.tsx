// =============================================================================
// ReorderButton — React island, client:load
// Adds all items from a past order back into the cart in one click.
// =============================================================================

import { useState } from "react";
import { $isCartOpen, addToCart } from "@/stores/cart.store";

interface OrderItem {
  product: {
    name: string;
    variantName: string;
    sku: string;
    imageUrl: string | null;
    price: number;
  };
  quantity: number;
  unitPrice: number;
}

interface Props {
  items: OrderItem[];
}

type State = "idle" | "adding" | "done";

export default function ReorderButton({ items }: Props) {
  const [state, setState] = useState<State>("idle");

  const handleReorder = () => {
    if (state !== "idle") {
      return;
    }
    setState("adding");

    // Small async gap so the loading state renders before the synchronous loop
    setTimeout(() => {
      for (const item of items) {
        addToCart({
          variantId: item.product.sku,
          productName: item.product.name,
          variantName: item.product.variantName,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          price: item.unitPrice,
          quantity: item.quantity,
        });
      }

      // addToCart already opens the drawer on the first item; make sure it's open
      $isCartOpen.set(true);

      setState("done");
      setTimeout(() => setState("idle"), 3000);
    }, 80);
  };

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm transition-all ${
        state === "done"
          ? "bg-green-500 text-white"
          : state === "adding"
            ? "cursor-wait bg-brand-500/80 text-white"
            : "bg-brand-500 text-white hover:bg-brand-600 active:scale-95"
      }`}
      disabled={state !== "idle"}
      onClick={handleReorder}
    >
      {state === "done" ? (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Ditambahkan ke Keranjang!
        </>
      ) : state === "adding" ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Menambahkan…
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Pesan Lagi
        </>
      )}
    </button>
  );
}
