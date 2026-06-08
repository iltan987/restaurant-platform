"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { type Restaurant } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { setRestaurantOnboarding } from "./api"

export function useSetOnboarding(slug: string) {
  const queryClient = useQueryClient()
  const key = ["restaurant", slug] as const

  return useMutation({
    mutationFn: ({
      id,
      onboardingStatus,
    }: {
      id: string
      onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
    }) => setRestaurantOnboarding(id, { onboardingStatus }),
    onMutate: async ({ onboardingStatus }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Restaurant | null>(key)
      queryClient.setQueryData<Restaurant | null>(key, (old) =>
        old ? { ...old, onboardingStatus } : old
      )
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(key, context?.previous)
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
