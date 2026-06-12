"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Category } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { deleteCategory } from "./api"

export function useDeleteCategory(slug: string) {
  const queryClient = useQueryClient()
  const key = ["categories", slug] as const

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(key, (old) =>
        (old ?? []).filter((c) => c.id !== id)
      )
      return { previous }
    },
    onError: (err, _id, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
