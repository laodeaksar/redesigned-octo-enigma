import { useState, useEffect, useRef, useCallback } from "react";
import { formatIDR } from "@/lib/utils";

const BASE = (import.meta as any).env?.PUBLIC_API_URL ?? "http://localhost:3000";

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  lowestPrice: number;
  highestPrice: number;
  primaryImage: string | null;
};

/*function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}*/

function PriceLabel({ low, high }: { low: number; high: number }) {
  if (low === high) return <span className="text-xs font-semibold text-brand-600">{formatIDR(low)}</span>;
  return (
    <span className="text-xs font-semibold text-brand-600">
      {formatIDR(low)} – {formatIDR(high)}
    </span>
  );
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const res = await fetch(
        `${BASE}/products?search=${encodeURIComponent(q)}&limit=6&status=active`,
        { signal: ac.signal }
      );
      if (!res.ok) throw new Error("search failed");
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setOpen(true);
      setActive(-1);
    } catch (e: any) {
      if (e?.name !== "AbortError") setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      inputRef.current?.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) {
        window.location.href = `/products/${suggestions[active].slug}`;
      } else if (query.trim()) {
        window.location.href = `/products?q=${encodeURIComponent(query.trim())}`;
      }
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/products?q=${encodeURIComponent(query.trim())}`;
    }
  }

  function selectSuggestion(slug: string) {
    window.location.href = `/products/${slug}`;
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <form onSubmit={onSubmit} role="search">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 text-gray-400">
            {loading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            )}
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder="Cari produk…"
            autoComplete="off"
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
            aria-label="Cari produk"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
              aria-label="Hapus pencarian"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
        >
          <ul>
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(-1)}
                onClick={() => selectSuggestion(s.slug)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                  i === active ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {s.primaryImage ? (
                    <img
                      src={s.primaryImage}
                      alt={s.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                  <PriceLabel low={s.lowestPrice} high={s.highestPrice} />
                </div>
                <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-50 bg-gray-50 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                if (query.trim()) window.location.href = `/products?q=${encodeURIComponent(query.trim())}`;
              }}
              className="flex w-full items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              Lihat semua hasil untuk "{query}"
            </button>
          </div>
        </div>
      )}

      {open && query.trim().length >= 2 && !loading && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-gray-100 bg-white px-4 py-5 text-center shadow-xl">
          <p className="text-sm text-gray-500">Produk tidak ditemukan untuk "<strong>{query}</strong>"</p>
        </div>
      )}
    </div>
  );
}
