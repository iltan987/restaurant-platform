"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Area, type CreateAreaInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createArea } from "./api"

export function useCreateArea(slug: string) {
  const queryClient = useQueryClient()
  const key = ["areas", slug] as const

  return useMutation({
    mutationFn: ({
      floorId,
      input,
    }: {
      floorId: string
      input: CreateAreaInput
    }) => createArea(floorId, input),
    onMutate: async ({ floorId, input }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Area[]>(key)
      const optimistic: Area = {
        id: `__optimistic__${Date.now()}`,
        floorId,
        name: input.name,
        code: input.code ?? null,
        position: input.position ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Area[]>(key, (old) => [
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
