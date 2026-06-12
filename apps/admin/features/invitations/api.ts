import { z } from "zod"

import { apiFetch, apiSend } from "@repo/api-client"
import { type Invitation, invitationSchema } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const inviteResultSchema = z.object({ invitation: invitationSchema })
const invitationListSchema = z.object({ invitations: invitationSchema.array() })

/** Every owner invitation for a restaurant (newest first), as the admin sees them. */
export async function fetchInvitations(
  restaurantId: string
): Promise<Invitation[]> {
  const { invitations } = await apiFetch(
    `${API}/admin/restaurants/${restaurantId}/invitations`,
    invitationListSchema,
    { cache: "no-store" }
  )
  return invitations
}

/** Invite the restaurant owner by email. Role is fixed to OWNER server-side. */
export async function inviteOwner(
  restaurantId: string,
  email: string
): Promise<Invitation> {
  const { invitation } = await apiFetch(
    `${API}/admin/restaurants/${restaurantId}/invitations`,
    inviteResultSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }
  )
  return invitation
}

/** Revoke a pending invitation. */
export function revokeInvitation(invitationId: string): Promise<void> {
  return apiSend(`${API}/admin/invitations/${invitationId}`, {
    method: "DELETE",
  })
}
