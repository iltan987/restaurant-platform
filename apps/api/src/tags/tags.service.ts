import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateTagInput,
  ErrorCode,
  type UpdateTagInput,
} from "@repo/schemas"

import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByRestaurant(restaurantId: string) {
    await this.getRestaurantOrThrow(restaurantId)
    return this.prisma.tag.findMany({
      where: { restaurantId },
      orderBy: { label: "asc" },
    })
  }

  async create(restaurantId: string, input: CreateTagInput) {
    await this.getRestaurantOrThrow(restaurantId)
    try {
      return await this.prisma.tag.create({
        data: {
          restaurantId,
          label: input.label,
          color: input.color ?? null,
        },
      })
    } catch (err: unknown) {
      if (isP2002(err)) throw labelTaken(input.label)
      throw err
    }
  }

  async update(id: string, input: UpdateTagInput) {
    await this.getOrThrow(id)
    try {
      return await this.prisma.tag.update({ where: { id }, data: input })
    } catch (err: unknown) {
      if (isP2002(err)) throw labelTaken(input.label ?? "")
      throw err
    }
  }

  /** Deletes a tag; Prisma detaches the implicit m2m rows so items stay intact. */
  async remove(id: string) {
    await this.getOrThrow(id)
    await this.prisma.tag.delete({ where: { id } })
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
    const tag = await this.prisma.tag.findUnique({ where: { id } })
    if (!tag) {
      throw new NotFoundException({
        code: ErrorCode.TAG_NOT_FOUND,
        message: `Tag with id "${id}" was not found`,
      })
    }
    return tag
  }
}

function labelTaken(label: string) {
  return new ConflictException({
    code: ErrorCode.TAG_LABEL_TAKEN,
    message: `Tag label "${label}" is already taken in this restaurant`,
  })
}
