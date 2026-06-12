"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type AvailabilityWindowInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { setAvailability } from "./availability-api"

/** Replace an item's availability windows (saved immediately on edit). */
export function useSetAvailability(categoryId: string, itemId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (windows: AvailabilityWindowInput[]) =>
      setAvailability(itemId, windows),
    onError: (err) => toastApiError(err),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item", itemId] })
      queryClient.invalidateQueries({ queryKey: ["menu-items", categoryId] })
    },
  })
}
