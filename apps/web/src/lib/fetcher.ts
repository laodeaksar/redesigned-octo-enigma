// =============================================================================
// Generic type-safe fetcher for TanStack Query
//
// Wraps apiProxy so every query automatically:
//   1. Calls /api/proxy/<path> (cookie-auth, never leaks tokens to the client)
//   2. Throws ApiError with .status and .code when !res.ok
//   3. Validates the response `.data` field with a Zod schema
//
// Usage:
//   const data = await fetcher("/cart", cartResponseSchema);
//   const products = await fetcher("/products", productListSchema, { params: { page: 1 } });
//
// IMPORTANT: This is for AUTHENTICATED (proxy) requests only.
// For public (SSR) fetches use `api.get()` from @/lib/api directly.
// =============================================================================

import type { z } from "zod";

import { ApiError, apiProxy } from "@/lib/api";

export type FetcherParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/**
 * Fetch from /api/proxy/<path> and parse the `.data` field with `schema`.
 * Throws ApiError on non-2xx responses (already handled by apiProxy).
 */
export async function fetcher<T>(
  path: string,
  schema: z.ZodSchema<T>,
  options?: { params?: FetcherParams }
): Promise<T> {
  const envelope = await apiProxy.get<{ success: true; data: unknown }>(path, {
    params: options?.params,
  });
  return schema.parse(envelope.data);
}

/**
 * POST variant — sends a JSON body and parses the response `.data` field.
 */
export async function fetcherPost<T>(
  path: string,
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<T> {
  const envelope = await apiProxy.post<{ success: true; data: unknown }>(
    path,
    body
  );
  return schema.parse(envelope.data);
}

/**
 * PATCH variant.
 */
export async function fetcherPatch<T>(
  path: string,
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<T> {
  const envelope = await apiProxy.patch<{ success: true; data: unknown }>(
    path,
    body
  );
  return schema.parse(envelope.data);
}

export { ApiError };
