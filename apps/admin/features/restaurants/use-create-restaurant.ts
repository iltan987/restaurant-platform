"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@repo/api-client"
import { slugify } from "@repo/core"
import { getErrorMessage } from "@repo/i18n"
import { type Restaurant } from "@repo/schemas"

import { createRestaurant, type RestaurantPage } from "./api"

const FIRST_PAGE_KEY = ["restaurants", 1] as const

export function useCreateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRestaurant,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["restaurants"] })
      const previous = queryClient.getQueryData<RestaurantPage>(FIRST_PAGE_KEY)

      const optimistic: Restaurant = {
        id: `__optimistic__${Date.now()}`,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        status: "INACTIVE",
        onboardingStatus: "IN_PROGRESS",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<RestaurantPage>(FIRST_PAGE_KEY, (old) =>
        old
          ? { ...old, items: [optimistic, ...old.items], total: old.total + 1 }
          : { items: [optimistic], total: 1, page: 1, pageSize: 20 }
      )
      return { previous }
    },
    onSuccess: () => {
      toast.success("Restoran eklendi.")
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(FIRST_PAGE_KEY, context?.previous)
      toast.error(
        err instanceof ApiError
          ? getErrorMessage(err.code)
          : "Sunucuya ulaşılamadı."
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] })
    },
  })
}
