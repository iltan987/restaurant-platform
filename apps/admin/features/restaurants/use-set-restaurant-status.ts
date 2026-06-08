"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type Restaurant } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { type RestaurantPage, setRestaurantStatus } from "./api"

export function useSetRestaurantStatus() {
  const queryClient = useQueryClient()
  const root = { queryKey: ["restaurants"] as const }

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: "ACTIVE" | "INACTIVE"
    }) => setRestaurantStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries(root)
      const snapshot = queryClient.getQueriesData<RestaurantPage>(root)
      queryClient.setQueriesData<RestaurantPage>(root, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((r) => (r.id === id ? { ...r, status } : r)),
            }
          : old
      )
      return { snapshot }
    },
    onSuccess: (restaurant: Restaurant) =>
      toast.success(
        restaurant.status === "ACTIVE"
          ? "Restoran yayına alındı."
          : "Restoran yayından kaldırıldı."
      ),
    onError: (err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries(root),
  })
}
