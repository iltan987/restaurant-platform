"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Category, type UpdateCategoryInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { updateCategory } from "./api"

/** Rename or hide/show a category (optimistic — the toggle should feel instant). */
export function useUpdateCategory(slug: string) {
  const queryClient = useQueryClient()
  const key = ["categories", slug] as const

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(key, (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...input } : c))
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
