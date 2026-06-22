"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { removeOwner } from "./api"
import { invitationsQueries } from "./queries"

/** Remove the accepted owner for a restaurant so a new invite can be sent. */
export function useRemoveOwner(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeOwner(restaurantId),
    onSuccess: () => {
      toast.success("Sahip kaldırıldı.")
    },
    onError: toastApiError,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: invitationsQueries.byRestaurant(restaurantId).queryKey,
      })
    },
  })
}
