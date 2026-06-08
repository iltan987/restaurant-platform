"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateFloorInput, type UpdateFloorInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createFloor, deleteFloor, updateFloor } from "./api"

/** Invalidate-based mutations — the admin panel favors simplicity over optimism. */
export function useCreateFloor(slug: string, restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFloorInput) => createFloor(restaurantId, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["floors", slug] }),
  })
}

export function useUpdateFloor(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFloorInput }) =>
      updateFloor(id, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["floors", slug] }),
  })
}

export function useDeleteFloor(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFloor(id),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["floors", slug] }),
  })
}
