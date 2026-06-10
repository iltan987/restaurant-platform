"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Category } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { reorderCategories } from "./api"

/** Persists a drag-reordered category list (optimistic so the drop sticks). */
export function useReorderCategories(slug: string, restaurantId: string) {
  const queryClient = useQueryClient()
  const key = ["categories", slug] as const

  return useMutation({
    mutationFn: (ids: string[]) => reorderCategories(restaurantId, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      const byId = new Map((previous ?? []).map((c) => [c.id, c]))
      queryClient.setQueryData<Category[]>(key, () =>
        ids
          .map((id, index) => {
            const c = byId.get(id)
            return c ? { ...c, position: index } : undefined
          })
          .filter((c): c is Category => c !== undefined)
      )
      return { previous }
    },
    onError: (err, _ids, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
