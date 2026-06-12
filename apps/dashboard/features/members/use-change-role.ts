"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type RestaurantRole } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { changeMemberRole } from "./api"
import { membersQueries } from "./queries"

/** Change a member's role. Last-owner demotion is rejected server-side. */
export function useChangeRole(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: RestaurantRole }) =>
      changeMemberRole(restaurantId, userId, role),
    onSuccess: () => toast.success("Rol güncellendi."),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: membersQueries.byRestaurant(restaurantId).queryKey,
      }),
  })
}
