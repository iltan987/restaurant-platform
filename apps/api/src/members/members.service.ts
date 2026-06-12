import { ForbiddenException, Injectable } from "@nestjs/common"

import { ErrorCode, type RestaurantRole } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

/** Role capability ordering: OWNER ⊇ MANAGER ⊇ STAFF. */
const ROLE_RANK: Record<RestaurantRole, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Restaurants the user belongs to, with their role — drives switching. */
  async listMemberships(userId: string) {
    const members = await this.prisma.restaurantMember.findMany({
      where: { userId },
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
  async requireMembership(
    restaurantId: string,
    userId: string,
    minRole?: RestaurantRole
  ) {
    const member = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    })
    if (!member) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "You are not a member of this restaurant",
      })
    }
    if (minRole && ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException({
        code: ErrorCode.INSUFFICIENT_ROLE,
        message: `This action requires the ${minRole} role`,
      })
    }
    return member
  }
}
