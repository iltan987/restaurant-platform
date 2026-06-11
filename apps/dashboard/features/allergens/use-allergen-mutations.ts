"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateAllergenInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createAllergen, deleteAllergen } from "./api"

/** Create / delete custom allergens; both refresh the restaurant's list. */
export function useAllergenMutations(restaurantId: string) {
  const queryClient = useQueryClient()
  const key = ["allergens", restaurantId] as const
  const settle = {
    onError: (err: unknown) => toastApiError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  }

  return {
    create: useMutation({
      mutationFn: (input: CreateAllergenInput) =>
        createAllergen(restaurantId, input),
      ...settle,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteAllergen(id),
      ...settle,
    }),
  }
}
