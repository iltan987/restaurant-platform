"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type FloorLayoutInput, type Table } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { saveFloorLayout } from "./api"

/**
 * Persists canvas positions for a floor's tables. Optimistic: the dropped
 * table sits at its new spot immediately (positions live in the `tables`
 * cache), rolling back on error. Keyed on `["tables", slug]` so the canvas and
 * the list view stay in sync.
 */
export function useSaveFloorLayout(slug: string) {
  const queryClient = useQueryClient()
  const key = ["tables", slug] as const

  return useMutation({
    mutationFn: ({
      floorId,
      positions,
    }: {
      floorId: string
      positions: FloorLayoutInput["positions"]
    }) => saveFloorLayout(floorId, positions),
    onMutate: async ({ positions }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Table[]>(key)
      const byId = new Map(positions.map((p) => [p.tableId, p]))
      queryClient.setQueryData<Table[]>(key, (old) =>
        (old ?? []).map((t) => {
          const p = byId.get(t.id)
          return p ? { ...t, positionX: p.x, positionY: p.y } : t
        })
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
