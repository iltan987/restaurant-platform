"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Area } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { deleteArea } from "./api"

export function useDeleteArea(slug: string) {
  const queryClient = useQueryClient()
  const key = ["areas", slug] as const

  return useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade?: boolean }) =>
      deleteArea(id, cascade),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Area[]>(key)
      queryClient.setQueryData<Area[]>(key, (old) =>
        (old ?? []).filter((a) => a.id !== id)
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ["tables", slug] })
    },
  })
}
