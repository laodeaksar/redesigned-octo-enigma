import { useCallback, useEffect, useRef, useState } from "react";
import { formatIDR } from "@/lib/utils";

const BASE =
  (import.meta as any).env?.PUBLIC_API_URL ?? "http://localhost:3000";

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
  if (low === high) {
    return (
      <span className="font-semibold text-brand-600 text-xs">
        {formatIDR(low)}
      </span>
    );
  }
  return (
    <span className="font-semibold text-brand-600 text-xs">
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

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      const res = await fetch(
        `${BASE}/products?search=${encodeURIComponent(q)}&limit=6&status=active`,
        { signal: ac.signal }
      );
      if (!res.ok) {
        throw new Error("search failed");
      }
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setOpen(true);
      setActive(-1);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      return;
    }

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
    <div className="relative w-full max-w-sm" ref={containerRef}>
      <form onSubmit={onSubmit} role="search">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 text-gray-400">
            {loading ? (
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
                  d="M4 12a8 8 0 018-8v8H4z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <input
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Cari produk"
            autoComplete="off"
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pr-4 pl-9 text-gray-900 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-200"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setOpen(true);
              }
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari produk…"
            ref={inputRef}
            type="search"
            value={query}
          />
          {query && (
            <button
              aria-label="Hapus pencarian"
              className="absolute right-3 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setOpen(false);
                inputRef.current?.focus();
              }}
              type="button"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
          role="listbox"
        >
          <ul>
            {suggestions.map((s, i) => (
              <li
                aria-selected={i === active}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                  i === active ? "bg-brand-50" : "hover:bg-gray-50"
                }`}
                key={s.id}
                onClick={() => selectSuggestion(s.slug)}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(-1)}
                role="option"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {s.primaryImage ? (
                    <img
                      alt={s.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={s.primaryImage}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">
                      📦
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 text-sm">
                    {s.name}
                  </p>
                  <PriceLabel high={s.highestPrice} low={s.lowestPrice} />
                </div>
                <svg
                  className="h-4 w-4 shrink-0 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </li>
            ))}
          </ul>
          <div className="border-gray-50 border-t bg-gray-50 px-3 py-2">
            <button
              className="flex w-full items-center gap-1.5 font-medium text-brand-600 text-xs hover:text-brand-700"
              onClick={() => {
                if (query.trim()) {
                  window.location.href = `/products?q=${encodeURIComponent(query.trim())}`;
                }
              }}
              type="button"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Lihat semua hasil untuk "{query}"
            </button>
          </div>
        </div>
      )}

      {open &&
        query.trim().length >= 2 &&
        !loading &&
        suggestions.length === 0 && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1.5 rounded-xl border border-gray-100 bg-white px-4 py-5 text-center shadow-xl">
            <p className="text-gray-500 text-sm">
              Produk tidak ditemukan untuk "<strong>{query}</strong>"
            </p>
          </div>
        )}
    </div>
  );
}
