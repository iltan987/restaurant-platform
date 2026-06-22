"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { toggleSuspension } from "./api"
import { ownerQueries } from "./queries"

export function useToggleSuspension(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (suspended: boolean) =>
      toggleSuspension(restaurantId, suspended),
    onSuccess: (_, suspended) => {
      toast.success(
        suspended ? "Erişim askıya alındı." : "Erişim yeniden açıldı."
      )
    },
    onError: toastApiError,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ownerQueries.byRestaurant(restaurantId).queryKey,
      })
    },
  })
}
