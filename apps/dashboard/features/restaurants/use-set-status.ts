"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type Restaurant } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { setRestaurantStatus } from "./api"

export function useSetStatus(slug: string) {
  const queryClient = useQueryClient()
  const key = ["restaurant", slug] as const

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: "ACTIVE" | "INACTIVE"
    }) => setRestaurantStatus(id, { status }),
    onMutate: async ({ status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Restaurant | null>(key)
      queryClient.setQueryData<Restaurant | null>(key, (old) =>
        old ? { ...old, status } : old
      )
      return { previous }
    },
    onSuccess: (restaurant) => {
      toast.success(
        restaurant.status === "ACTIVE"
          ? "Restoran yayına alındı."
          : "Restoran yayından kaldırıldı."
      )
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
