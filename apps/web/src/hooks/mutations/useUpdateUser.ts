// =============================================================================
// useUpdateUser — mutation for updating current user's profile
//
// Invalidates queryKeys.user() on success so UserSettingsForm and any other
// component reading from useUser() gets fresh data automatically.
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetcherPatch } from "@/lib/fetcher";
import { queryKeys } from "@/lib/query-keys";
import { userSchema, type UserProfile } from "@/hooks/queries/useUser";
import type { UpdateProfileInput } from "@repo/common/schemas";

export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput): Promise<UserProfile> =>
      fetcherPatch("/users/me", userSchema, input),

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.user() });
      const previousUser = qc.getQueryData<UserProfile>(queryKeys.user());

      // Optimistic update — reflect name/avatar change immediately
      qc.setQueryData<UserProfile>(queryKeys.user(), old => {
        if (!old) return old;
        return {
          ...old,
          name: input.name ?? old.name,
          avatarUrl:
            input.avatarUrl !== undefined ? input.avatarUrl : old.avatarUrl,
        };
      });

      return { previousUser };
    },

    onError: (_, __, ctx) => {
      if (ctx?.previousUser !== undefined) {
        qc.setQueryData(queryKeys.user(), ctx.previousUser);
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });
}

export type UseUpdateUserReturn = ReturnType<typeof useUpdateUser>;
