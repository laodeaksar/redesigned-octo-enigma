import { atom, action } from "nanostores";

// Set berisi productId yang sudah di-wishlist
export const $wishlistedIds = atom<Set<string>>(new Set());

const API = "/api/wishlist"; // melalui Astro server route → api-gateway

/** Hydrate dari server setelah login */
export const hydrateWishlist = action(
  $wishlistedIds,
  "hydrateWishlist",
  async (store) => {
    try {
      const cached = localStorage.getItem("wishlist");
      if (cached) {
        store.set(new Set(JSON.parse(cached)));
      }
    } catch {}

    try {
      const res = await fetch(API);
      if (!res.ok) return;
      const { data } = await res.json();
      const ids = (data.items as { product: { id: string } }[]).map(
        (i) => i.product.id
      );
      const next = new Set(ids);
      store.set(next);
      localStorage.setItem("wishlist", JSON.stringify(ids));
    } catch {}
  }
);

/** Optimistic toggle — rollback jika server gagal */
export const toggleWishlist = action(
  $wishlistedIds,
  "toggleWishlist",
  async (store, productId: string) => {
    const prev = new Set(store.get());
    const next = new Set(prev);

    // Optimistic update
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    store.set(next);
    persist(next);

    try {
      const res = await fetch(`${API}/${productId}/toggle`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("toggle failed");
      const { data } = await res.json();

      // Reconcile dengan server truth
      const reconciled = new Set(store.get());
      if (data.wishlisted) {
        reconciled.add(productId);
      } else {
        reconciled.delete(productId);
      }
      store.set(reconciled);
      persist(reconciled);
    } catch {
      // Rollback
      store.set(prev);
      persist(prev);
    }
  }
);

function persist(ids: Set<string>) {
  try {
    localStorage.setItem("wishlist", JSON.stringify([...ids]));
  } catch {}
}
