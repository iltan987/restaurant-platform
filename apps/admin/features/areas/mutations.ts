"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateAreaInput, type UpdateAreaInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createArea, deleteArea, updateArea } from "./api"

export function useCreateArea(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      floorId,
      input,
    }: {
      floorId: string
      input: CreateAreaInput
    }) => createArea(floorId, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["areas", slug] }),
  })
}

export function useUpdateArea(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAreaInput }) =>
      updateArea(id, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["areas", slug] }),
  })
}

export function useDeleteArea(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["areas", slug] }),
  })
}
