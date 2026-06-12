"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateTagInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createTag, deleteTag } from "./api"

/** Create / delete reusable tags; both refresh the restaurant's list. */
export function useTagMutations(restaurantId: string) {
  const queryClient = useQueryClient()
  const key = ["tags", restaurantId] as const
  const settle = {
    onError: (err: unknown) => toastApiError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  }

  return {
    create: useMutation({
      mutationFn: (input: CreateTagInput) => createTag(restaurantId, input),
      ...settle,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteTag(id),
      ...settle,
    }),
  }
}
