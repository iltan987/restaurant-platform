import { Injectable, Logger } from "@nestjs/common"

import { type ActivityType } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

const DEFAULT_PAGE_SIZE = 30

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Best-effort audit write — fire-and-forget. The INSERT is intentionally NOT
   * awaited, so the caller's response never waits on (nor breaks from) the audit
   * trail; a failure is swallowed and logged rather than thrown. Callers may
   * still `await` this safely (it resolves immediately). The API runs as a
   * persistent process (Render), so the write completes after the response.
   */
  record(input: {
    type: ActivityType
    restaurantId?: string | null
    meta?: Record<string, string>
  }): void {
    // Guard BOTH a synchronous throw (try) and an async rejection (.catch) so a
    // broken/absent activity store can never surface in the caller's response.
    try {
      void this.prisma.activity
        .create({
          data: {
            type: input.type,
            restaurantId: input.restaurantId ?? null,
            meta: input.meta ?? undefined,
          },
        })
        .catch((err) => {
          this.logger.warn(`Failed to record activity ${input.type}: ${err}`)
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
