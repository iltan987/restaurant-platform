import { z } from "zod"

import { apiFetch } from "@repo/api-client"
import { type InvitationLookup, invitationLookupSchema } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

/** Public lookup of an invitation by its raw token (for the accept screen). */
export function lookupInvitation(token: string): Promise<InvitationLookup> {
  return apiFetch(`${API}/invitations/${token}`, invitationLookupSchema, {
    cache: "no-store",
  })
}

const acceptResultSchema = z.object({ ok: z.boolean() })

/** Accept an invitation, setting the account password if it has none yet. */
export function acceptInvitation(token: string, password: string) {
  return apiFetch(`${API}/invitations/${token}/accept`, acceptResultSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
}
