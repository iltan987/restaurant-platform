"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Floor, type UpdateFloorInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { updateFloor } from "./api"

export function useUpdateFloor(slug: string) {
  const queryClient = useQueryClient()
  const key = ["floors", slug] as const

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFloorInput }) =>
      updateFloor(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Floor[]>(key)
      queryClient.setQueryData<Floor[]>(key, (old) =>
        (old ?? []).map((f) => (f.id === id ? { ...f, ...input } : f))
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
