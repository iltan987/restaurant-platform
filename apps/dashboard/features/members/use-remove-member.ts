"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { removeMember } from "./api"
import { membersQueries } from "./queries"

/** Remove a member. Removing the last owner is rejected server-side. */
export function useRemoveMember(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => removeMember(restaurantId, userId),
    onSuccess: () => toast.success("Üye çıkarıldı."),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: membersQueries.byRestaurant(restaurantId).queryKey,
      }),
  })
}
