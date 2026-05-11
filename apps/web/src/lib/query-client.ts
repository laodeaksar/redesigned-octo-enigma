// =============================================================================
// TanStack Query — shared QueryClient instance
//
// Exported as a singleton so the same cache is used by both
// QueryProvider (React tree) and any direct cache manipulation in mutations.
// =============================================================================

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes — data considered fresh
      retry: 1,                         // one retry on network error
      refetchOnWindowFocus: false,      // no background refetch on tab switch
    },
  },
});
