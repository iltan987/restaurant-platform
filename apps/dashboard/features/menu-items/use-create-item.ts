"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type CreateMenuItemInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { createItem } from "./api"

export function useCreateItem(categoryId: string) {
  const queryClient = useQueryClient()
  const key = ["menu-items", categoryId] as const

  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => createItem(categoryId, input),
    onError: (err) => toastApiError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
