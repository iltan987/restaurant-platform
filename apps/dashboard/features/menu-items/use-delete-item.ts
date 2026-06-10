"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type MenuItem } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { deleteItem } from "./api"

export function useDeleteItem(categoryId: string) {
  const queryClient = useQueryClient()
  const key = ["menu-items", categoryId] as const

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MenuItem[]>(key)
      queryClient.setQueryData<MenuItem[]>(key, (old) =>
        (old ?? []).filter((i) => i.id !== id)
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
