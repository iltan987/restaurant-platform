"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateTableInput, type Table } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createTable } from "./api"

export function useCreateTable(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: ({
      areaId,
      input,
    }: {
      areaId: string
      input: CreateTableInput
    }) => createTable(areaId, input),
    onMutate: async ({ areaId, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      const optimistic: Table = {
        id: `__optimistic__${Date.now()}`,
        areaId,
        label: input.label,
        capacity: input.capacity ?? null,
        positionX: null,
        positionY: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Table[]>(key, (old) => [
        ...(old ?? []),
        optimistic,
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
