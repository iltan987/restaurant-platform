"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  type Plan,
  type Restaurant,
  type RestaurantWithCounts,
} from "@repo/schemas"

import { PLAN_LABELS } from "@/lib/plan"
import { toastApiError } from "@/lib/toast-error"

import { type RestaurantPage, setRestaurantPlan } from "./api"
import { restaurantsQueries } from "./queries"

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
    onSuccess: (restaurant: Restaurant) => {
      // The detail view reads ["restaurant", slug] (not the list root patched
      // above), so update it too — otherwise the tab only changes on refresh.
      queryClient.setQueryData<RestaurantWithCounts>(
        restaurantsQueries.detail(restaurant.slug).queryKey,
        (old) => (old ? { ...old, plan: restaurant.plan } : old)
      )
      toast.success(`Plan güncellendi: ${PLAN_LABELS[restaurant.plan]}`)
    },
    onError: (err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      )
      toastApiError(err)
    },
    onSettled: () => queryClient.invalidateQueries(root),
  })
}
