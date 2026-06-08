"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { slugify } from "@repo/core"
import { type Restaurant, type UpdateRestaurantInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { type RestaurantPage, updateRestaurant } from "./api"

export function useUpdateRestaurant() {
  const queryClient = useQueryClient()
  const root = { queryKey: ["restaurants"] as const }

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRestaurantInput }) =>
      updateRestaurant(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries(root)
      const snapshot = queryClient.getQueriesData<RestaurantPage>(root)
      const patch: Partial<Restaurant> = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
      }
      queryClient.setQueriesData<RestaurantPage>(root, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((r) =>
                r.id === id ? { ...r, ...patch } : r
              ),
            }
          : old
      )
      return { snapshot }
    },
    onSuccess: () => toast.success("Restoran güncellendi."),
    onError: (err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries(root),
  })
}
