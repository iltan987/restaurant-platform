import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { slugify, STANDARD_ALLERGENS } from "@repo/core"
import {
  type CreateRestaurantInput,
  ErrorCode,
  type OnboardingStatusInput,
  type RestaurantStatusInput,
  type SetPlanInput,
  type UpdateRestaurantInput,
} from "@repo/schemas"

import { ActivityService } from "../activity/activity.service"
import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

/**
 * Loads the sub-resource counts a restaurant row needs. `floors`, `categories`
 * and `menuItems` hang off the restaurant directly so Prisma counts them in the
 * same row. Areas/tables live one and two levels down (floor → area → table),
 * so we pull just their counts through a nested select. Crucially this is a
 * constant number of queries regardless of page size — no per-row round-trips.
 */
const COUNTS_INCLUDE = {
  _count: { select: { floors: true, categories: true, menuItems: true } },
  floors: {
    select: { areas: { select: { _count: { select: { tables: true } } } } },
  },
} as const

type RowWithCounts = {
  _count: { floors: number; categories: number; menuItems: number }
  floors: { areas: { _count: { tables: number } }[] }[]
}

/** Flatten the nested count payload into the flat shape the client expects. */
function withCounts<T extends RowWithCounts>(row: T) {
  const { _count, floors, ...rest } = row
  let areaCount = 0
  let tableCount = 0
  for (const floor of floors) {
    areaCount += floor.areas.length
    for (const area of floor.areas) tableCount += area._count.tables
  }
  return {
    ...rest,
    floorCount: _count.floors,
    areaCount,
    tableCount,
    categoryCount: _count.categories,
    menuItemCount: _count.menuItems,
  }
}

/**
 * Slugs that collide with reserved subdomains / app routes and must never be
 * handed to a tenant, regardless of DB state.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "menu",
  "panel",
  "www",
])

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  /**
   * Live availability check for the create flow. Normalizes the raw input the
   * same way `create` does, rejects reserved/blank slugs, then checks the
   * unique index — a single indexed lookup.
   */
  async isSlugAvailable(input: string) {
    const normalized = slugify(input)
    if (!normalized || RESERVED_SLUGS.has(normalized)) {
      return { slug: input, normalized, available: false }
    }
    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: normalized },
      select: { id: true },
    })
    return { slug: input, normalized, available: existing === null }
  }

  async create(input: CreateRestaurantInput) {
    const base = slugify(input.slug ?? input.name)
    if (!base) {
      throw new ConflictException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Could not derive a slug from the provided name",
      })
    }

    const slug = await this.ensureUniqueSlug(base)

    try {
      // Create the restaurant (INACTIVE / IN_PROGRESS via DB defaults) together
      // with its default floor + area so onboarding always starts non-empty,
      // and seed the standard allergen set (SC-007).
      const restaurant = await this.prisma.$transaction(async (tx) => {
        const created = await tx.restaurant.create({
          data: { name: input.name, slug },
        })
        const floor = await tx.floor.create({
          data: { restaurantId: created.id, name: "Zemin Kat" },
        })
        await tx.area.create({
          data: { floorId: floor.id, name: "Genel" },
        })
        await tx.allergen.createMany({
          data: STANDARD_ALLERGENS.map((label) => ({
            restaurantId: created.id,
            label,
            isStandard: true,
          })),
        })
        return created
      })
      await this.activity.record({
        type: "RESTAURANT_CREATED",
        restaurantId: restaurant.id,
        meta: { name: restaurant.name, slug: restaurant.slug },
      })
      return restaurant
    } catch (err: unknown) {
      // P2002 — unique constraint violation (race between check and insert)
      if (isP2002(err)) {
        throw new ConflictException({
          code: ErrorCode.SLUG_TAKEN,
          message: `Slug "${slug}" is already taken`,
        })
      }
      throw err
    }
  }

  async findAll(page = 1, pageSize = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: COUNTS_INCLUDE,
      }),
      this.prisma.restaurant.count(),
    ])
    return { items: rows.map(withCounts), total, page, pageSize }
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: COUNTS_INCLUDE,
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with slug "${slug}" was not found`,
      })
    }
    return withCounts(restaurant)
  }

  /** Go live / deactivate. Activating requires ≥1 table (FR-016/FR-017). */
  async setStatus(id: string, input: RestaurantStatusInput) {
    await this.getByIdOrThrow(id)

    if (input.status === "ACTIVE") {
      const tableCount = await this.prisma.table.count({
        where: { area: { floor: { restaurantId: id } } },
      })
      if (tableCount === 0) {
        throw new ConflictException({
          code: ErrorCode.GO_LIVE_REQUIRES_TABLE,
          message: "A restaurant needs at least one table before going live",
        })
      }
    }

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { status: input.status },
    })
    await this.activity.record({
      type: "STATUS_CHANGED",
      restaurantId: id,
      meta: { to: input.status },
    })
    return updated
  }

  /**
   * Admin edit of name/slug. A slug change is re-uniqued and P2002-guarded
   * (SLUG_TAKEN); the caller is responsible for warning about broken links on a
   * live restaurant (FR-008).
   */
  async update(id: string, input: UpdateRestaurantInput) {
    const existing = await this.getByIdOrThrow(id)

    const data: {
      name?: string
      slug?: string
      language?: string
      currency?: string
    } = {}
    if (input.name !== undefined) data.name = input.name
    if (input.slug !== undefined) data.slug = slugify(input.slug)
    if (input.language !== undefined) data.language = input.language
    if (input.currency !== undefined) data.currency = input.currency

    try {
      const updated = await this.prisma.restaurant.update({
        where: { id },
        data,
      })
      if (data.name !== undefined && data.name !== existing.name) {
        await this.activity.record({
          type: "RESTAURANT_RENAMED",
          restaurantId: id,
          meta: { from: existing.name, to: data.name },
        })
      }
      if (data.slug !== undefined && data.slug !== existing.slug) {
        await this.activity.record({
          type: "SLUG_CHANGED",
          restaurantId: id,
          meta: { from: existing.slug, to: data.slug },
        })
      }
      return updated
    } catch (err: unknown) {
      if (isP2002(err)) {
        throw new ConflictException({
          code: ErrorCode.SLUG_TAKEN,
          message: `Slug "${data.slug}" is already taken`,
        })
      }
      throw err
    }
  }

  /** Admin delete. Floors → areas → tables cascade via the DB FKs (FR-007). */
  async remove(id: string) {
    await this.getByIdOrThrow(id)
    await this.prisma.restaurant.delete({ where: { id } })
  }

  /** Change the billing tier. No payment side effects yet — just records it. */
  async setPlan(id: string, input: SetPlanInput) {
    const existing = await this.getByIdOrThrow(id)
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { plan: input.plan },
    })
    await this.activity.record({
      type: "PLAN_CHANGED",
      restaurantId: id,
      meta: { from: existing.plan, to: input.plan },
    })
    return updated
  }

  /** Finish / skip onboarding — never auto-activates (FR-019). */
  async setOnboarding(id: string, input: OnboardingStatusInput) {
    await this.getByIdOrThrow(id)
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { onboardingStatus: input.onboardingStatus },
    })
    await this.activity.record({
      type: "ONBOARDING_CHANGED",
      restaurantId: id,
      meta: { to: input.onboardingStatus },
    })
    return updated
  }

  private async getByIdOrThrow(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with id "${id}" was not found`,
      })
    }
    return restaurant
  }

  /** Appends -2, -3, … until a free slug is found. The @unique + P2002 guard is authoritative. */
  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base
    let n = 1
    while (
      await this.prisma.restaurant.findUnique({
        where: { slug: candidate },
      })
    ) {
      n += 1
      candidate = `${base}-${n}`.slice(0, 63).replace(/-+$/g, "")
    }
    return candidate
  }
}
