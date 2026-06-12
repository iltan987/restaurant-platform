"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { revokeInvitation } from "./api"
import { invitationsQueries } from "./queries"

/** Revoke a pending owner invitation. */
export function useRevokeInvitation(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => {
      toast.success("Davet iptal edildi.")
    },
    onError: toastApiError,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: invitationsQueries.byRestaurant(restaurantId).queryKey,
      })
    },
  })
}
