"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type MenuItemListEntry, type UpdateMenuItemInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { updateItem } from "./api"

/** Edit fields or toggle in-stock (optimistic for a snappy stock toggle). */
export function useUpdateItem(categoryId: string) {
  const queryClient = useQueryClient()
  const key = ["menu-items", categoryId] as const

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMenuItemInput }) =>
      updateItem(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MenuItemListEntry[]>(key)
      queryClient.setQueryData<MenuItemListEntry[]>(key, (old) =>
        (old ?? []).map((i) => (i.id === id ? { ...i, ...input } : i))
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
