"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type InviteMemberInput } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { inviteMember } from "./api"
import { membersQueries } from "./queries"

/** Invite a team member with a role. Supersedes any pending invite server-side. */
export function useInviteMember(restaurantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: InviteMemberInput) => inviteMember(restaurantId, input),
    onSuccess: () => toast.success("Davet gönderildi."),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: membersQueries.byRestaurant(restaurantId).queryKey,
      }),
  })
}
