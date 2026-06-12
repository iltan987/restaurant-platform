"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type Plan, type Restaurant } from "@repo/schemas"

import { PLAN_LABELS } from "@/lib/plan"
import { toastApiError } from "@/lib/toast-error"

import { type RestaurantPage, setRestaurantPlan } from "./api"

export function useSetRestaurantPlan() {
  const queryClient = useQueryClient()
  const root = { queryKey: ["restaurants"] as const }

  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Plan }) =>
      setRestaurantPlan(id, { plan }),
    onMutate: async ({ id, plan }) => {
      await queryClient.cancelQueries(root)
      const snapshot = queryClient.getQueriesData<RestaurantPage>(root)
      queryClient.setQueriesData<RestaurantPage>(root, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((r) => (r.id === id ? { ...r, plan } : r)),
            }
          : old
      )
      return { snapshot }
    },
    onSuccess: (restaurant: Restaurant) =>
      toast.success(`Plan güncellendi: ${PLAN_LABELS[restaurant.plan]}`),
    onError: (err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries(root),
  })
}
