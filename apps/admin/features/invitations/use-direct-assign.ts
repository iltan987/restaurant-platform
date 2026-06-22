"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { directAssign } from "./api"
import { ownerQueries } from "./queries"

export function useDirectAssign(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => directAssign(restaurantId, email),
    onSuccess: ({ tempPassword }) => {
      if (!tempPassword) toast.success("Sahip atandı.")
    },
    onError: toastApiError,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ownerQueries.byRestaurant(restaurantId).queryKey,
      })
    },
  })
}
