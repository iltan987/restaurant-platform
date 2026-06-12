import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateCategoryInput,
  ErrorCode,
  type UpdateCategoryInput,
} from "@repo/schemas"

import { ActivityService } from "../activity/activity.service"
import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService
  ) {}

  /** All categories for a restaurant (ordered, including hidden) — by slug. */
  async findAllBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) throw restaurantNotFound(slug)
    return this.prisma.category.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { position: "asc" },
    })
  }

  async create(restaurantId: string, input: CreateCategoryInput) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })
    if (!restaurant) throw restaurantNotFound(restaurantId)

    // New categories append to the end of the current order.
    const position = await this.prisma.category.count({
      where: { restaurantId },
    })
    try {
      const category = await this.prisma.category.create({
        data: { restaurantId, name: input.name, position },
      })
      await this.activity.record({
        type: "CATEGORY_CREATED",
        restaurantId,
        meta: { name: category.name },
      })
      return category
    } catch (err: unknown) {
      if (isP2002(err)) throw categoryNameTaken(input.name)
      throw err
    }
  }

  async update(id: string, input: UpdateCategoryInput) {
    await this.getOrThrow(id)
    try {
      return await this.prisma.category.update({ where: { id }, data: input })
    } catch (err: unknown) {
      if (isP2002(err)) throw categoryNameTaken(input.name ?? "")
      throw err
    }
  }

  /** Deletes a category. Blocked while it still contains items. */
  async remove(id: string) {
    const category = await this.getOrThrow(id)
    const itemCount = await this.prisma.menuItem.count({
      where: { categoryId: id },
    })
    if (itemCount > 0) {
      throw new ConflictException({
        code: ErrorCode.CATEGORY_NOT_EMPTY,
        message: "Remove the category's items before deleting it",
      })
    }
    await this.prisma.category.delete({ where: { id } })
    await this.activity.record({
      type: "CATEGORY_DELETED",
      restaurantId: category.restaurantId,
      meta: { name: category.name },
    })
  }

  /**
   * Reassigns `position` from array index in one transaction. Every id must
   * belong to this restaurant (a stray id is rejected as CATEGORY_NOT_FOUND
   * rather than silently reordering another restaurant's category).
   */
  async reorder(restaurantId: string, ids: string[]) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })
    if (!restaurant) throw restaurantNotFound(restaurantId)

    const owned = await this.prisma.category.findMany({
      where: { id: { in: ids }, restaurantId },
      select: { id: true },
    })
    const known = new Set(owned.map((c) => c.id))
    const stray = ids.find((id) => !known.has(id))
    if (stray) throw categoryNotFound(stray)

    await this.prisma.$transaction((tx) =>
      Promise.all(
        ids.map((id, index) =>
          tx.category.update({ where: { id }, data: { position: index } })
        )
      )
    )
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { position: "asc" },
    })
  }

  private async getOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } })
    if (!category) throw categoryNotFound(id)
    return category
  }
}

function restaurantNotFound(ref: string) {
  return new NotFoundException({
    code: ErrorCode.RESTAURANT_NOT_FOUND,
    message: `Restaurant "${ref}" was not found`,
  })
}

function categoryNotFound(id: string) {
  return new NotFoundException({
    code: ErrorCode.CATEGORY_NOT_FOUND,
    message: `Category with id "${id}" was not found`,
  })
}

function categoryNameTaken(name: string) {
  return new ConflictException({
    code: ErrorCode.CATEGORY_NAME_TAKEN,
    message: `Category name "${name}" is already taken in this restaurant`,
  })
}
