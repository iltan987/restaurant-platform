import { createHash, randomBytes } from "node:crypto"

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { betterAuth } from "better-auth"

import { ErrorCode, type RestaurantRole } from "@repo/schemas"

import { getEmailSender, renderInvitationEmail } from "../auth/email"
import { sharedOptions } from "../auth/instances"
import { env } from "../config/env"
import { PrismaService } from "../prisma/prisma.service"

/** Invitation lifetime — bounded so a leaked link eventually dies (FR-006). */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Sign-up-enabled view of the dashboard audience over the SAME `dash_*` tables.
 * The live `dashboardAuth` disables sign-up (accounts are invitation-only), so
 * acceptance creates the credentialed user here, then marks the email verified
 * (the invitation token already proves control). Mirrors the admin seed (D5/D7).
 */
const dashboardSignUpAuth = betterAuth({
  ...sharedOptions("dash"),
  basePath: "/api/auth/dashboard",
  emailAndPassword: { enabled: true, autoSignIn: false },
})

const generateToken = () => randomBytes(32).toString("base64url")
const hashToken = (raw: string) =>
  createHash("sha256").update(raw).digest("hex")
const normalizeEmail = (email: string) => email.trim().toLowerCase()
/** 16-char URL-safe password from 12 random bytes. */
const generatePassword = (): string =>
  randomBytes(12).toString("base64url").slice(0, 16)

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a PENDING invitation, cancelling any prior pending one for the same
   * (restaurant, email) pair, and email the recipient a single-use accept link.
   */
  async invite(opts: {
    restaurantId: string
    email: string
    role: RestaurantRole
    invitedByAdmin: boolean
    invitedByUserId?: string
  }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: opts.restaurantId },
      select: { id: true, name: true },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant ${opts.restaurantId} was not found`,
      })
    }

    const email = normalizeEmail(opts.email)

    // Supersede any outstanding pending invite for this pair.
    await this.prisma.restaurantInvitation.updateMany({
      where: { restaurantId: restaurant.id, email, status: "PENDING" },
      data: { status: "REVOKED" },
    })

    const token = generateToken()
    const invitation = await this.prisma.restaurantInvitation.create({
      data: {
        restaurantId: restaurant.id,
        email,
        role: opts.role,
        tokenHash: hashToken(token),
        invitedByAdmin: opts.invitedByAdmin,
        invitedByUserId: opts.invitedByUserId ?? null,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    })

    const link = `${env.DASHBOARD_URL ?? ""}/davet/${token}`
    // Fire-and-forget would risk losing the email on crash; await is fine here.
    const message = await renderInvitationEmail({
      restaurantName: restaurant.name,
      link,
    })
    await getEmailSender().send({ to: email, ...message })

    return invitation
  }

  /** Invitations for a restaurant (admin/owner view), newest first. */
  async list(restaurantId: string) {
    return this.prisma.restaurantInvitation.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    })
  }

  /** Revoke a pending invitation (PENDING → REVOKED). */
  async revoke(invitationId: string) {
    const invitation = await this.prisma.restaurantInvitation.findUnique({
      where: { id: invitationId },
    })
    if (!invitation) {
      throw new NotFoundException({
        code: ErrorCode.INVITATION_NOT_FOUND,
        message: "Invitation not found",
      })
    }
    if (invitation.status !== "PENDING") {
      throw new ConflictException({
        code: ErrorCode.INVITATION_NOT_PENDING,
        message: "Only pending invitations can be revoked",
      })
    }
    await this.prisma.restaurantInvitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    })
  }

  /** Public lookup for the acceptance screen. Throws a terminal-state error if
   * the invitation isn't usable. */
  async lookup(rawToken: string) {
    const invitation = await this.resolvePending(rawToken)
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: invitation.restaurantId },
      select: { name: true },
    })
    // Owner-issued invites name the inviter; admin-issued owner invites don't.
    let invitedBy: string | null = null
    if (invitation.invitedByUserId) {
      const inviter = await this.prisma.dashUser.findUnique({
        where: { id: invitation.invitedByUserId },
        select: { name: true, email: true },
      })
      invitedBy = inviter?.name || inviter?.email?.split("@")[0] || null
    }
    return {
      restaurantName: restaurant?.name ?? "",
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedBy,
    }
  }

  /**
   * Accept an invitation: ensure the dashboard user exists (creating it with the
   * given password + verified email when absent), attach the membership, and
   * mark the invitation ACCEPTED — the last two atomically.
   */
  async accept(rawToken: string, password: string) {
    const invitation = await this.resolvePending(rawToken)

    const userId = await this.ensureDashboardUser(invitation.email, password)

    await this.prisma.$transaction(async (tx) => {
      // Idempotent membership (a user re-accepting / invited twice).
      const existing = await tx.restaurantMember.findUnique({
        where: {
          restaurantId_userId: {
            restaurantId: invitation.restaurantId,
            userId,
          },
        },
      })
      if (!existing) {
        await tx.restaurantMember.create({
          data: {
            restaurantId: invitation.restaurantId,
            userId,
            role: invitation.role,
          },
        })
      }
      await tx.restaurantInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      })
    })
  }

  /**
   * Look an invitation up by raw token (hash compare) and assert it is usable.
   * Lazily transitions an elapsed PENDING invitation to EXPIRED.
   */
  private async resolvePending(rawToken: string) {
    const invitation = await this.prisma.restaurantInvitation.findFirst({
      where: { tokenHash: hashToken(rawToken) },
    })
    if (!invitation) {
      throw new NotFoundException({
        code: ErrorCode.INVITATION_NOT_FOUND,
        message: "Invitation not found",
      })
    }
    if (invitation.status === "ACCEPTED") {
      throw new ConflictException({
        code: ErrorCode.INVITATION_ALREADY_USED,
        message: "This invitation has already been used",
      })
    }
    if (invitation.status === "REVOKED") {
      throw new ConflictException({
        code: ErrorCode.INVITATION_REVOKED,
        message: "This invitation has been revoked",
      })
    }
    if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
      if (invitation.status === "PENDING") {
        await this.prisma.restaurantInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        })
      }
      throw new ConflictException({
        code: ErrorCode.INVITATION_EXPIRED,
        message: "This invitation has expired",
      })
    }
    return invitation
  }

  /**
   * Directly assign an OWNER without the email invitation flow. Creates a
   * dashboard user with a generated password when none exists for `email`;
   * returns that password (shown once to the admin) or null if the user
   * already had an account.
   */
  async adminDirectAssign(
    restaurantId: string,
    email: string
  ): Promise<{ tempPassword: string | null }> {
    const normalized = normalizeEmail(email)

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant ${restaurantId} not found`,
      })
    }

    const existingOwner = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (existingOwner) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: "This restaurant already has an owner",
      })
    }

    let tempPassword: string | null = null
    let user = await this.prisma.dashUser.findUnique({
      where: { email: normalized },
      select: { id: true },
    })

    if (!user) {
      tempPassword = generatePassword()
      await dashboardSignUpAuth.api.signUpEmail({
        body: {
          email: normalized,
          password: tempPassword,
          name: normalized.split("@")[0] ?? "Owner",
        },
      })
      user = await this.prisma.dashUser.findUnique({
        where: { email: normalized },
        select: { id: true },
      })
      if (!user) {
        throw new ConflictException({
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create dashboard user",
        })
      }
      await this.prisma.dashUser.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
    }

    await this.prisma.restaurantMember.create({
      data: {
        restaurantId,
        userId: user.id,
        role: "OWNER",
        directlyAssigned: true,
      },
    })

    return { tempPassword }
  }

  /** Suspend or re-enable the OWNER's access without removing their membership. */
  async adminToggleSuspension(
    restaurantId: string,
    suspended: boolean
  ): Promise<void> {
    const owner = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (!owner) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "This restaurant has no owner to suspend",
      })
    }
    await this.prisma.restaurantMember.update({
      where: { id: owner.id },
      data: { suspended },
    })
    if (suspended) {
      await this.prisma.dashSession.deleteMany({
        where: { userId: owner.userId },
      })
    }
  }

  /** Current OWNER for a restaurant, derived from the member table (admin view). */
  async adminGetOwner(restaurantId: string) {
    const member = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (!member) return { owner: null }
    const user = await this.prisma.dashUser.findUnique({
      where: { id: member.userId },
      select: { email: true },
    })
    return {
      owner: {
        email: user?.email ?? "",
        suspended: member.suspended,
        directlyAssigned: member.directlyAssigned,
      },
    }
  }

  /** Remove the current OWNER member for a restaurant (admin-only, no last-owner guard). */
  async adminRemoveOwner(restaurantId: string): Promise<void> {
    const owner = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (!owner) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "This restaurant has no owner to remove",
      })
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantMember.delete({ where: { id: owner.id } })
      // Revoke the accepted invitation so the UI source of truth resets to
      // "no owner" — the invite form then becomes active again.
      await tx.restaurantInvitation.updateMany({
        where: { restaurantId, status: "ACCEPTED" },
        data: { status: "REVOKED" },
      })
    })
  }

  /** Returns the dash_user id for `email`, creating a verified credential user
   * with `password` when none exists yet. */
  private async ensureDashboardUser(email: string, password: string) {
    const existing = await this.prisma.dashUser.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existing) return existing.id

    await dashboardSignUpAuth.api.signUpEmail({
      body: { email, password, name: email.split("@")[0] ?? "Owner" },
    })

    const created = await this.prisma.dashUser.findUnique({
      where: { email },
      select: { id: true },
    })
    if (!created) {
      throw new ConflictException({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to create dashboard user",
      })
    }
    // The invitation token proves email control → mark verified so the
    // (verification-gated) dashboard sign-in works immediately.
    await this.prisma.dashUser.update({
      where: { id: created.id },
      data: { emailVerified: true },
    })
    return created.id
  }
}
