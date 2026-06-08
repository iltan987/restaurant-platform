"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Table, type UpdateTableInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { updateTable } from "./api"

export function useUpdateTable(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTableInput }) =>
      updateTable(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      queryClient.setQueryData<Table[]>(key, (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...input } : t))
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
