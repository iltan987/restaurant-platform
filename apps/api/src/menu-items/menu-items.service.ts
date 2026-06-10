import { Injectable, NotFoundException } from "@nestjs/common"

import {
  type CreateMenuItemInput,
  ErrorCode,
  type UpdateMenuItemInput,
} from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Items within a category, ordered. */
  async findAllByCategory(categoryId: string) {
    await this.getCategoryOrThrow(categoryId)
    return this.prisma.menuItem.findMany({
      where: { categoryId },
      orderBy: { position: "asc" },
    })
  }

  /** Full item detail incl. ordered option groups (each with ordered options). */
  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        optionGroups: {
          orderBy: { position: "asc" },
          include: { options: { orderBy: { position: "asc" } } },
        },
      },
    })
    if (!item) {
      throw new NotFoundException({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
        message: `Menu item with id "${id}" was not found`,
      })
    }
    return item
  }

  async create(categoryId: string, input: CreateMenuItemInput) {
    const category = await this.getCategoryOrThrow(categoryId)
    const position = await this.prisma.menuItem.count({ where: { categoryId } })
    return this.prisma.menuItem.create({
      data: {
        restaurantId: category.restaurantId,
        categoryId,
        name: input.name,
        priceMinor: input.priceMinor,
        inStock: input.inStock ?? true,
        position,
      },
    })
  }

  async update(id: string, input: UpdateMenuItemInput) {
    await this.getItemOrThrow(id)
    return this.prisma.menuItem.update({ where: { id }, data: input })
  }

  async remove(id: string) {
    await this.getItemOrThrow(id)
    await this.prisma.menuItem.delete({ where: { id } })
  }

  /** Reassigns `position` within a category from array index, in one tx. */
  async reorder(categoryId: string, ids: string[]) {
    await this.getCategoryOrThrow(categoryId)
    const owned = await this.prisma.menuItem.findMany({
      where: { id: { in: ids }, categoryId },
      select: { id: true },
    })
    const known = new Set(owned.map((i) => i.id))
    const stray = ids.find((id) => !known.has(id))
    if (stray) throw menuItemNotFound(stray)

    await this.prisma.$transaction((tx) =>
      Promise.all(
        ids.map((id, index) =>
          tx.menuItem.update({ where: { id }, data: { position: index } })
        )
      )
    )
    return this.prisma.menuItem.findMany({
      where: { categoryId },
      orderBy: { position: "asc" },
    })
  }

  private async getCategoryOrThrow(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    })
    if (!category) {
      throw new NotFoundException({
        code: ErrorCode.CATEGORY_NOT_FOUND,
        message: `Category with id "${categoryId}" was not found`,
      })
    }
    return category
  }

  private async getItemOrThrow(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } })
    if (!item) throw menuItemNotFound(id)
    return item
  }
}

function menuItemNotFound(id: string) {
  return new NotFoundException({
    code: ErrorCode.MENU_ITEM_NOT_FOUND,
    message: `Menu item with id "${id}" was not found`,
  })
}
