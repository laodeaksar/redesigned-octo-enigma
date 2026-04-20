// =============================================================================
// API client — server-side (Astro pages) + client-side (React islands)
// =============================================================================

const BASE = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch ────────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  token?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, params, ...init } = options;

  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url.toString(), { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: res.statusText } })) as { error?: { code?: string; message?: string } };
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? res.statusText,
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string, opts?: FetchOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};

// ── Domain helpers ────────────────────────────────────────────────────────────

export type Product = {
  id: string; name: string; slug: string; status: string;
  primaryImage: string | null; lowestPrice: number; highestPrice: number;
  totalStock: number; tags: string[]; categoryId: string; createdAt: string;
};

export type ProductDetail = Product & {
  description: string; shortDescription: string | null; weight: number | null;
  category: { id: string; name: string; slug: string } | null;
  variants: Array<{
    id: string; sku: string; name: string;
    attributes: Record<string, string>;
    price: number; compareAtPrice: number | null;
    stock: number; isActive: boolean;
  }>;
  images: Array<{ id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number }>;
};

export type Category = {
  id: string; name: string; slug: string;
  description: string | null; imageUrl: string | null; parentId: string | null;
};

export type Order = {
  id: string; orderNumber: string; status: string;
  itemCount: number; grandTotal: number; createdAt: string;
};

export type OrderDetail = Order & {
  items: Array<{
    product: { name: string; variantName: string; sku: string; imageUrl: string | null; price: number };
    quantity: number; unitPrice: number; subtotal: number;
  }>;
  shipping: {
    courier: string; service: string; trackingNumber: string | null; cost: number;
    address: { recipientName: string; phone: string; street: string; city: string; province: string; postalCode: string };
    shippedAt: string | null;
  };
  pricing: { subtotal: number; shippingCost: number; discountTotal: number; taxTotal: number; grandTotal: number };
  paymentId: string | null; expiresAt: string; updatedAt: string;
};

export type User = {
  id: string; email: string; name: string; role: string;
  avatarUrl: string | null; emailVerified: boolean;
};

export type Payment = {
  id: string; orderId: string; status: string; method: string | null;
  amount: number; snapToken: string | null; snapRedirectUrl: string | null;
  virtualAccount: { bank: string; vaNumber: string; expiresAt: string } | null;
  eWallet: { provider: string; qrCodeUrl: string | null; expiresAt: string } | null;
  expiresAt: string;
};

