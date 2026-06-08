"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { deleteRestaurant, type RestaurantPage } from "./api"

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()
  const root = { queryKey: ["restaurants"] as const }

  return useMutation({
    mutationFn: (id: string) => deleteRestaurant(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(root)
      const snapshot = queryClient.getQueriesData<RestaurantPage>(root)
      queryClient.setQueriesData<RestaurantPage>(root, (old) =>
        old
          ? {
              ...old,
              items: old.items.filter((r) => r.id !== id),
              total: Math.max(0, old.total - 1),
            }
          : old
      )
      return { snapshot }
    },
    onSuccess: () => toast.success("Restoran silindi."),
    onError: (err, _id, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries(root),
  })
}
