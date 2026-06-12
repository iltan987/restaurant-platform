import { Injectable, Logger } from "@nestjs/common"

import { type ActivityType } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

const DEFAULT_PAGE_SIZE = 30

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort audit write. Logging must never break the caller's primary
   * mutation, so a failure here is swallowed (and logged) rather than thrown.
   */
  async record(input: {
    type: ActivityType
    restaurantId?: string | null
    meta?: Record<string, string>
  }) {
    try {
      await this.prisma.activity.create({
        data: {
          type: input.type,
          restaurantId: input.restaurantId ?? null,
          meta: input.meta ?? undefined,
        },
      })
    } catch (err) {
      this.logger.warn(`Failed to record activity ${input.type}: ${err}`)
    }
  }

  /** Global feed, newest first. */
  async findAll(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activity.count(),
    ])
    return { items, total, page, pageSize }
  }

  /** One restaurant's feed, newest first. */
  async findByRestaurant(slug: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const where = { restaurant: { slug } }
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activity.count({ where }),
    ])
    return { items, total, page, pageSize }
  }
}
