import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateAllergenInput,
  ErrorCode,
  type UpdateAllergenInput,
} from "@repo/schemas"

import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class AllergensService {
  constructor(private readonly prisma: PrismaService) {}

  /** All allergens for a restaurant: standard set first, then custom, by label. */
  async findAllByRestaurant(restaurantId: string) {
    await this.getRestaurantOrThrow(restaurantId)
    return this.prisma.allergen.findMany({
      where: { restaurantId },
      orderBy: [{ isStandard: "desc" }, { label: "asc" }],
    })
  }

  async create(restaurantId: string, input: CreateAllergenInput) {
    await this.getRestaurantOrThrow(restaurantId)
    try {
      return await this.prisma.allergen.create({
        data: { restaurantId, label: input.label, isStandard: false },
      })
    } catch (err: unknown) {
      if (isP2002(err)) throw labelTaken(input.label)
      throw err
    }
  }

  async update(id: string, input: UpdateAllergenInput) {
    await this.getOrThrow(id)
    try {
      return await this.prisma.allergen.update({ where: { id }, data: input })
    } catch (err: unknown) {
      if (isP2002(err)) throw labelTaken(input.label)
      throw err
    }
  }

  /**
   * Deletes a custom allergen; the standard seeded set is protected. Prisma
   * detaches the implicit m2m rows, so assigned items stay intact (just lose
   * the assignment).
   */
  async remove(id: string) {
    const allergen = await this.getOrThrow(id)
    if (allergen.isStandard) {
      throw new ConflictException({
        code: ErrorCode.ALLERGEN_STANDARD_PROTECTED,
        message: "Standard allergens cannot be deleted",
      })
    }
    await this.prisma.allergen.delete({ where: { id } })
  }

  private async getRestaurantOrThrow(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant "${restaurantId}" was not found`,
      })
    }
    return restaurant
  }

  private async getOrThrow(id: string) {
    const allergen = await this.prisma.allergen.findUnique({ where: { id } })
    if (!allergen) {
      throw new NotFoundException({
        code: ErrorCode.ALLERGEN_NOT_FOUND,
        message: `Allergen with id "${id}" was not found`,
      })
    }
    return allergen
  }
}

function labelTaken(label: string) {
  return new ConflictException({
    code: ErrorCode.ALLERGEN_LABEL_TAKEN,
    message: `Allergen label "${label}" is already taken in this restaurant`,
  })
}
