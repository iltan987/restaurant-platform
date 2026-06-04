"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiError } from "@repo/api-client"
import { slugify } from "@repo/core"
import { getErrorMessage } from "@repo/i18n"
import { type Restaurant } from "@repo/schemas"

import { createRestaurant } from "./api"

export function useCreateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRestaurant,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["restaurants"] })
      const previous = queryClient.getQueryData<Restaurant[]>(["restaurants"])

      const optimistic: Restaurant = {
        id: `__optimistic__${Date.now()}`,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Restaurant[]>(["restaurants"], (old) => [
        optimistic,
        ...(old ?? []),
      ])
      return { previous }
    },
    onSuccess: () => {
      toast.success("Restoran eklendi.")
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(["restaurants"], context?.previous)
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
