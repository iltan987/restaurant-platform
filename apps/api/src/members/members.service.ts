import { ForbiddenException, Injectable } from "@nestjs/common"

import {
  ErrorCode,
  hasPermission,
  type InviteMemberInput,
  type RestaurantPermission,
  type RestaurantRole,
} from "@repo/schemas"

import { InvitationsService } from "../invitations/invitations.service"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService
  ) {}

  /** Restaurants the user belongs to, with their role — drives switching. */
  async listMemberships(userId: string) {
    const members = await this.prisma.restaurantMember.findMany({
      where: { userId, suspended: false },
      orderBy: { createdAt: "asc" },
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
    })
    return members.map((m) => ({
      restaurantId: m.restaurantId,
      name: m.restaurant.name,
      slug: m.restaurant.slug,
      role: m.role,
    }))
  }

  /**
   * Resolve the caller's membership of a restaurant, enforcing authorization at
   * the data layer (FR-011): denies with NOT_A_MEMBER when absent, and with
   * INSUFFICIENT_ROLE when a `minRole` is required and not met. Returns the
   * membership so callers can branch on the exact role.
   */
  async requireMembership(restaurantId: string, userId: string) {
    const member = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    })
    if (!member) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "You are not a member of this restaurant",
      })
    }
    if (member.suspended) {
      throw new ForbiddenException({
        code: ErrorCode.MEMBER_SUSPENDED,
        message: "Your account has been suspended for this restaurant",
      })
    }
    return member
  }

  /**
   * Like {@link requireMembership} but also asserts the caller's role grants
   * `action`, denying with INSUFFICIENT_ROLE otherwise (FR-013, FR-016).
   */
  async requirePermission(
    restaurantId: string,
    userId: string,
    action: RestaurantPermission
  ) {
    const member = await this.requireMembership(restaurantId, userId)
    if (!hasPermission(member.role, action)) {
      throw new ForbiddenException({
        code: ErrorCode.INSUFFICIENT_ROLE,
        message: `Your role (${member.role}) cannot perform "${action}"`,
      })
    }
    return member
  }

  /** Members of a restaurant with their email + role, oldest first (US3). */
  async listMembers(restaurantId: string) {
    const members = await this.prisma.restaurantMember.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "asc" },
    })
    const users = await this.prisma.dashUser.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, email: true },
    })
    const emailById = new Map(users.map((u) => [u.id, u.email]))
    return members.map((m) => ({
      userId: m.userId,
      email: emailById.get(m.userId) ?? "",
      role: m.role,
    }))
  }

  /**
   * Invite a team member with a chosen role, reusing the invitation pipeline
   * (single-use token, email) but attributed to the inviting owner (FR-012).
   */
  inviteMember(
    restaurantId: string,
    invitedByUserId: string,
    input: InviteMemberInput
  ) {
    return this.invitations.invite({
      restaurantId,
      email: input.email,
      role: input.role,
      invitedByAdmin: false,
      invitedByUserId,
    })
  }

  /** Change a member's role, protecting the last OWNER from demotion (FR-014/015). */
  async changeRole(
    restaurantId: string,
    targetUserId: string,
    role: RestaurantRole
  ) {
    const member = await this.requireTargetMember(restaurantId, targetUserId)
    if (member.role === "OWNER" && role !== "OWNER") {
      await this.assertNotLastOwner(restaurantId)
    }
    const updated = await this.prisma.restaurantMember.update({
      where: { restaurantId_userId: { restaurantId, userId: targetUserId } },
      data: { role },
    })
    return { userId: updated.userId, email: member.email, role: updated.role }
  }

  /** Remove a member, refusing to remove the last OWNER (FR-014/015). */
  async removeMember(restaurantId: string, targetUserId: string) {
    const member = await this.requireTargetMember(restaurantId, targetUserId)
    if (member.role === "OWNER") {
      await this.assertNotLastOwner(restaurantId)
    }
    await this.prisma.restaurantMember.delete({
      where: { restaurantId_userId: { restaurantId, userId: targetUserId } },
    })
  }

  /** The member being acted upon must exist; denies with NOT_A_MEMBER otherwise. */
  private async requireTargetMember(restaurantId: string, userId: string) {
    const member = await this.requireMembership(restaurantId, userId)
    const user = await this.prisma.dashUser.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    return { ...member, email: user?.email ?? "" }
  }

  /** Throws LAST_OWNER when the restaurant has only one OWNER left. */
  private async assertNotLastOwner(restaurantId: string) {
    const owners = await this.prisma.restaurantMember.count({
      where: { restaurantId, role: "OWNER" },
    })
    if (owners <= 1) {
      throw new ForbiddenException({
        code: ErrorCode.LAST_OWNER,
        message: "A restaurant must always have at least one owner",
      })
    }
  }
}
