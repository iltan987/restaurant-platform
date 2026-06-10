"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { toastApiError } from "@/lib/toast-error"

import { updateItem } from "./api"

/**
 * Assign allergens/tags to an item by replacing the id set (saved immediately,
 * like option groups). Refreshes both the item detail (drives the pickers'
 * checked state) and the category's item list.
 */
export function useSetItemRelations(categoryId: string, itemId: string) {
  const queryClient = useQueryClient()
  const settle = {
    onError: (err: unknown) => toastApiError(err),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item", itemId] })
      queryClient.invalidateQueries({ queryKey: ["menu-items", categoryId] })
    },
  }

  return {
    setAllergens: useMutation({
      mutationFn: (allergenIds: string[]) =>
        updateItem(itemId, { allergenIds }),
      ...settle,
    }),
    setTags: useMutation({
      mutationFn: (tagIds: string[]) => updateItem(itemId, { tagIds }),
      ...settle,
    }),
  }
}
