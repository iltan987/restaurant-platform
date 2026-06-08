import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { slugify } from "@repo/core"
import {
  type CreateRestaurantInput,
  ErrorCode,
  type OnboardingStatusInput,
  type RestaurantStatusInput,
} from "@repo/schemas"

import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

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
      // with its default floor + area so onboarding always starts non-empty.
      return await this.prisma.$transaction(async (tx) => {
        const restaurant = await tx.restaurant.create({
          data: { name: input.name, slug },
        })
        const floor = await tx.floor.create({
          data: { restaurantId: restaurant.id, name: "Zemin Kat" },
        })
        await tx.area.create({
          data: { floorId: floor.id, name: "Genel" },
        })
        return restaurant
      })
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
    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.restaurant.count(),
    ])
    return { items, total, page, pageSize }
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with slug "${slug}" was not found`,
      })
    }
    return restaurant
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

    return this.prisma.restaurant.update({
      where: { id },
      data: { status: input.status },
    })
  }

  /** Finish / skip onboarding — never auto-activates (FR-019). */
  async setOnboarding(id: string, input: OnboardingStatusInput) {
    await this.getByIdOrThrow(id)
    return this.prisma.restaurant.update({
      where: { id },
      data: { onboardingStatus: input.onboardingStatus },
    })
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
