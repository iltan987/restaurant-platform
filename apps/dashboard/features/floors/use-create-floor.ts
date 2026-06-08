"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateFloorInput, type Floor } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createFloor } from "./api"

export function useCreateFloor(slug: string, restaurantId: string) {
  const queryClient = useQueryClient()
  const key = ["floors", slug] as const

  return useMutation({
    mutationFn: (input: CreateFloorInput) => createFloor(restaurantId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Floor[]>(key)
      const optimistic: Floor = {
        id: `__optimistic__${Date.now()}`,
        restaurantId,
        name: input.name,
        position: input.position ?? previous?.length ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Floor[]>(key, (old) => [
        ...(old ?? []),
        optimistic,
      ])
      return { previous }
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
