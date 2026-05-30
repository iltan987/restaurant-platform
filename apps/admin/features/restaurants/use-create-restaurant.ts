"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { type Restaurant } from "@repo/schemas"
import { getErrorMessage } from "@/lib/messages"
import { ApiError, createRestaurant } from "./api"

/** Best-effort client-side slug approximation — used only for the optimistic UI preview. */
function approxSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63)
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRestaurant,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["restaurants"] })
      const previous = queryClient.getQueryData<Restaurant[]>(["restaurants"])

      const optimistic: Restaurant = {
        id: `__optimistic__${Date.now()}`,
        name: input.name,
        slug: input.slug ?? approxSlug(input.name),
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Restaurant[]>(["restaurants"], (old) => [
        optimistic,
        ...(old ?? []),
      ])
      return { previous }
    },
    onSuccess: () => {
      toast.success("Restoran eklendi.")
    },
    onError: (err, _input, context) => {
      queryClient.setQueryData(["restaurants"], context?.previous)
      toast.error(
        err instanceof ApiError
          ? getErrorMessage(err.code)
          : "Sunucuya ulaşılamadı."
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] })
    },
  })
}
