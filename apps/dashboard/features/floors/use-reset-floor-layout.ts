"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Table } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { resetFloorLayout } from "./api"

/**
 * Clears every saved position on a floor so its tables fall back to the
 * automatic grid layout. Optimistic: the given tables drop their coords in the
 * `["tables", slug]` cache immediately, rolling back on error.
 */
export function useResetFloorLayout(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: ({ floorId }: { floorId: string; tableIds: string[] }) =>
      resetFloorLayout(floorId),
    onMutate: async ({ tableIds }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      const ids = new Set(tableIds)
      queryClient.setQueryData<Table[]>(key, (old) =>
        (old ?? []).map((t) =>
          ids.has(t.id) ? { ...t, positionX: null, positionY: null } : t
        )
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
