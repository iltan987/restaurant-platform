"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Floor } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { deleteFloor } from "./api"

export function useDeleteFloor(slug: string) {
  const queryClient = useQueryClient()
  const key = ["floors", slug] as const

  return useMutation({
    mutationFn: ({ id, cascade }: { id: string; cascade?: boolean }) =>
      deleteFloor(id, cascade),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Floor[]>(key)
      queryClient.setQueryData<Floor[]>(key, (old) =>
        (old ?? []).filter((f) => f.id !== id)
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => {
      // cascade can remove areas + tables too — refresh all three.
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ["areas", slug] })
      queryClient.invalidateQueries({ queryKey: ["tables", slug] })
    },
  })
}
