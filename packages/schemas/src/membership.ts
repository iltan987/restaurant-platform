import { z } from "zod"

// ── Enums (single source of truth for the allowed sets; mirror the Prisma
// enums in @repo/db) ──

export const restaurantRoleSchema = z.enum(["OWNER", "MANAGER", "STAFF"])
export type RestaurantRole = z.infer<typeof restaurantRoleSchema>

export const invitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED",
])
export type InvitationStatus = z.infer<typeof invitationStatusSchema>

// ── Invitation inputs ──

/** Admin invites a restaurant owner. Role is fixed to OWNER server-side. */
export const inviteOwnerSchema = z.object({
  email: z.email(),
})
export type InviteOwnerInput = z.infer<typeof inviteOwnerSchema>

/** Owner invites a team member with a chosen role (US3). */
export const inviteMemberSchema = z.object({
  email: z.email(),
  role: restaurantRoleSchema,
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

/**
 * Accept an invitation by token. A password is set only if the dashboard
 * account has none yet; bounds match Better Auth's defaults (8–128).
 */
export const acceptInvitationSchema = z.object({
  password: z.string().min(8).max(128),
})
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>

/** Change a member's role (US3). */
export const updateMemberRoleSchema = z.object({
  role: restaurantRoleSchema,
})
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>

// ── API response schemas ──

/** Invitation as the admin/owner sees it when listing. */
export const invitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: restaurantRoleSchema,
  status: invitationStatusSchema,
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>

/** Public lookup for the acceptance screen (no token/hash leaked). */
export const invitationLookupSchema = z.object({
  restaurantName: z.string(),
  email: z.string(),
  role: restaurantRoleSchema,
  status: invitationStatusSchema,
})
export type InvitationLookup = z.infer<typeof invitationLookupSchema>

/** One of the signed-in user's restaurant memberships (drives switching). */
export const membershipSchema = z.object({
  restaurantId: z.string(),
  name: z.string(),
  slug: z.string(),
  role: restaurantRoleSchema,
})
export type Membership = z.infer<typeof membershipSchema>

/** A member of a restaurant, as listed in the team UI (US3). */
export const memberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: restaurantRoleSchema,
})
export type Member = z.infer<typeof memberSchema>
