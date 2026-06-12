"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastApiError } from "@/lib/toast-error"

import { inviteOwner } from "./api"
import { invitationsQueries } from "./queries"

/** Invite (or re-invite) the owner of a restaurant. Supersedes any pending invite server-side. */
export function useInviteOwner(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => inviteOwner(restaurantId, email),
    onSuccess: () => {
      toast.success("Davet gönderildi.")
    },
    onError: toastApiError,
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: invitationsQueries.byRestaurant(restaurantId).queryKey,
      })
    },
  })
}
