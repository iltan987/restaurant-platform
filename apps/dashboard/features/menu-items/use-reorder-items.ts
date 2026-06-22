"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type MenuItemListEntry } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { reorderItems } from "./api"

/** Persists a drag-reordered item list within a category (optimistic). */
export function useReorderItems(categoryId: string) {
  const queryClient = useQueryClient()
  const key = ["menu-items", categoryId] as const

  return useMutation({
    mutationFn: (ids: string[]) => reorderItems(categoryId, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MenuItemListEntry[]>(key)
      const byId = new Map((previous ?? []).map((i) => [i.id, i]))
      queryClient.setQueryData<MenuItemListEntry[]>(key, () =>
        ids
          .map((id, index) => {
            const i = byId.get(id)
            return i ? { ...i, position: index } : undefined
          })
          .filter((i): i is MenuItemListEntry => i !== undefined)
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
