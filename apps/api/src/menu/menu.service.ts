import { Injectable, NotFoundException } from "@nestjs/common"

import {
  type DayOfWeek,
  isOrderableNow,
  istanbulNow,
  type LocalNow,
} from "@repo/core"
import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { S3Service } from "../storage/s3.service"

/** Relations loaded for every public item — ordered the way the menu renders. */
const ITEM_INCLUDE = {
  optionGroups: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" } } },
  },
  allergens: { orderBy: { label: "asc" } },
  tags: { orderBy: { label: "asc" } },
  availabilityWindows: { orderBy: { startMin: "asc" } },
  media: { orderBy: { position: "asc" } },
} as const

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  /**
   * The public menu tree for an ACTIVE restaurant, by slug. Non-existent or
   * non-ACTIVE tenants are indistinguishable (both RESTAURANT_NOT_FOUND) so the
   * public surface never leaks an unpublished menu. Hidden categories are
   * excluded; each item's `orderableNow` is computed in Europe/Istanbul.
   */
  async getBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { isHidden: false },
          orderBy: { position: "asc" },
          include: {
            items: { orderBy: { position: "asc" }, include: ITEM_INCLUDE },
          },
        },
      },
    })

    if (!restaurant || restaurant.status !== "ACTIVE") {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Active restaurant with slug "${slug}" was not found`,
      })
    }

    const now = istanbulNow(this.nowDate())

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
      },
      categories: restaurant.categories.map((category) => ({
        ...category,
        items: category.items.map((item) => ({
          ...item,
          media: item.media.map((m) => ({
            id: m.id,
            itemId: m.itemId,
            type: m.type,
            url: this.s3.publicUrl(m.storageKey),
            mimeType: m.mimeType,
            position: m.position,
          })),
          orderableNow: this.orderableNow(item, now),
        })),
      })),
    }
  }

  private orderableNow(
    item: {
      inStock: boolean
      availabilityWindows: {
        days: DayOfWeek[]
        startMin: number
        endMin: number
      }[]
    },
    now: LocalNow
  ) {
    return isOrderableNow(
      { inStock: item.inStock, windows: item.availabilityWindows },
      now
    )
  }

  /** Seam for deterministic tests — the real clock in production. */
  protected nowDate(): Date {
    return new Date()
  }
}
