import { z } from "zod"

import { apiFetch, apiSend } from "@repo/api-client"
import {
  type InviteMemberInput,
  type Member,
  memberSchema,
  type RestaurantRole,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const membersListSchema = z.object({ members: memberSchema.array() })

/** The team of a restaurant (caller must be a member). */
export async function fetchMembers(restaurantId: string): Promise<Member[]> {
  const { members } = await apiFetch(
    `${API}/restaurants/${restaurantId}/members`,
    membersListSchema,
    { cache: "no-store" }
  )
  return members
}

/** Invite a team member with a role (owner-only server-side). */
export function inviteMember(
  restaurantId: string,
  input: InviteMemberInput
): Promise<void> {
  return apiSend(`${API}/restaurants/${restaurantId}/members/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

/** Change a member's role (owner-only; last-owner protected server-side). */
export function changeMemberRole(
  restaurantId: string,
  userId: string,
  role: RestaurantRole
): Promise<void> {
  return apiSend(`${API}/restaurants/${restaurantId}/members/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  })
}

/** Remove a member (owner-only; last-owner protected server-side). */
export function removeMember(
  restaurantId: string,
  userId: string
): Promise<void> {
  return apiSend(`${API}/restaurants/${restaurantId}/members/${userId}`, {
    method: "DELETE",
  })
}
