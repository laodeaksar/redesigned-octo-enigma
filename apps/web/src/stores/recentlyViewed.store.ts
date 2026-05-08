// =============================================================================
// Recently Viewed store — nanostores + localStorage persistence
// =============================================================================

import { atom } from "nanostores";

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 10;

export interface RecentProduct {
  highestPrice: number;
  id: string;
  lowestPrice: number;
  name: string;
  primaryImage: string | null;
  slug: string;
}

function load(): RecentProduct[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: RecentProduct[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const $recentlyViewed = atom<RecentProduct[]>([]);

export function hydrateRecentlyViewed() {
  $recentlyViewed.set(load());
}

export function trackView(product: RecentProduct) {
  const current = $recentlyViewed.get();
  const filtered = current.filter((p) => p.id !== product.id);
  const updated = [product, ...filtered].slice(0, MAX_ITEMS);
  $recentlyViewed.set(updated);
  save(updated);
}
