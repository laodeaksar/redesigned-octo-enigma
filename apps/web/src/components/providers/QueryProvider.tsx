// =============================================================================
// QueryProvider — wraps the React tree with TanStack QueryClientProvider
//
// Usage in BaseLayout.astro:
//   <QueryProvider client:only="react">
//     <slot />
//   </QueryProvider>
//
// ReactQueryDevtools is only included in development builds.
// It is NOT rendered in production (import.meta.env.PROD === true).
// =============================================================================

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ReactNode } from "react";

import { queryClient } from "@/lib/query-client";

interface Props {
  children: ReactNode;
}

export default function QueryProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
