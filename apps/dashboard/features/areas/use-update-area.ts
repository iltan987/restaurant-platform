"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Area, type UpdateAreaInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { updateArea } from "./api"

export function useUpdateArea(slug: string) {
  const queryClient = useQueryClient()
  const key = ["areas", slug] as const

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAreaInput }) =>
      updateArea(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Area[]>(key)
      queryClient.setQueryData<Area[]>(key, (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, ...input } : a))
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
