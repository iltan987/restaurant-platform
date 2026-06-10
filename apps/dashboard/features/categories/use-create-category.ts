"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Category, type CreateCategoryInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createCategory } from "./api"

export function useCreateCategory(slug: string, restaurantId: string) {
  const queryClient = useQueryClient()
  const key = ["categories", slug] as const

  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      createCategory(restaurantId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      const optimistic: Category = {
        id: `__optimistic__${Date.now()}`,
        restaurantId,
        name: input.name,
        position: previous?.length ?? 0,
        isHidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Category[]>(key, (old) => [
        ...(old ?? []),
        optimistic,
      ])
      return { previous }
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
