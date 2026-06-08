"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateTablesBulkInput, type Table } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { bulkCreateTables } from "./api"

/**
 * Quick add-N. We optimistically append the labels the server will generate
 * (`startNumber + i`) so the list — and the next-label computation that feeds
 * `startNumber` — advance immediately, even on rapid consecutive adds.
 */
export function useBulkCreateTables(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: ({
      areaId,
      input,
    }: {
      areaId: string
      input: CreateTablesBulkInput
    }) => bulkCreateTables(areaId, input),
    onMutate: async ({ areaId, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      const start = input.startNumber ?? 1
      const prefix = input.labelPrefix ?? ""
      const optimistic: Table[] = Array.from(
        { length: input.count },
        (_, i) => ({
          id: `__optimistic__${Date.now()}_${i}`,
          areaId,
          label: `${prefix}${start + i}`,
          capacity: null,
          positionX: null,
          positionY: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )
      queryClient.setQueryData<Table[]>(key, (old) => [
        ...(old ?? []),
        ...optimistic,
      ])
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
