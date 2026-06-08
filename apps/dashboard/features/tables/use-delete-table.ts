"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Table } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { deleteTable } from "./api"

export function useDeleteTable(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      queryClient.setQueryData<Table[]>(key, (old) =>
        (old ?? []).filter((t) => t.id !== id)
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
