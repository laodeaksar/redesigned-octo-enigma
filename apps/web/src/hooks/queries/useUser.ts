// =============================================================================
// useUser — query hook for the current authenticated user
//
// Fetches from /api/proxy/users/me via the cookie-auth proxy.
// Returns null when not logged in (query is disabled or returns 401).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { fetcher } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-keys";

// ── Schema ────────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  avatarUrl: z.string().nullable(),
  banExpires: z.string().nullable().optional(),
  banReason: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  email: z.email(),
  emailVerified: z.boolean(),
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: z.string(),
});

export type UserProfile = z.infer<typeof userSchema>;

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseUserOptions {
  enabled?: boolean;
  initialData?: UserProfile;
}

export function useUser(options: UseUserOptions = {}) {
  const { enabled = true, initialData } = options;

  return useQuery({
    queryKey: queryKeys.user(),
    queryFn: () => fetcher("/users/me", userSchema),
    enabled,
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: 1000 * 60 * 10, // 10 min — profile changes rarely
    retry: (failureCount, error) => {
      // Don't retry on 401 (user is not logged in)
      if ((error as { status?: number }).status === 401) return false;
      return failureCount < 1;
    },
  });
}

export type UseUserReturn = ReturnType<typeof useUser>;
