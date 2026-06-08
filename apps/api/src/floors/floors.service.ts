import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateFloorInput,
  ErrorCode,
  type UpdateFloorInput,
} from "@repo/schemas"

import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySlug(slug: string, page = 1, pageSize = 200) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) throw restaurantNotFound(slug)

    const where = { restaurantId: restaurant.id }
    const [items, total] = await Promise.all([
      this.prisma.floor.findMany({
        where,
        orderBy: { position: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.floor.count({ where }),
    ])
    return { items, total, page, pageSize }
  }

  async create(restaurantId: string, input: CreateFloorInput) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with id "${restaurantId}" was not found`,
      })
    }

    try {
      return await this.prisma.floor.create({
        data: {
          restaurantId,
          name: input.name,
          position: input.position ?? 0,
        },
      })
    } catch (err: unknown) {
      if (isP2002(err)) throw floorNameTaken(input.name)
      throw err
    }
  }

  async update(id: string, input: UpdateFloorInput) {
    await this.getFloorOrThrow(id)
    try {
      return await this.prisma.floor.update({ where: { id }, data: input })
    } catch (err: unknown) {
      if (isP2002(err)) throw floorNameTaken(input.name ?? "")
      throw err
    }
  }

  /**
   * Deletes a floor. Non-empty floors are blocked (FLOOR_NOT_EMPTY) unless
   * `cascade` is explicitly set — then the DB cascades areas → tables. Cascade
   * is destructive (it invalidates those tables' QR codes), so callers must opt in.
   */
  async remove(id: string, cascade = false) {
    await this.getFloorOrThrow(id)
    if (!cascade) {
      const areaCount = await this.prisma.area.count({ where: { floorId: id } })
      if (areaCount > 0) {
        throw new ConflictException({
          code: ErrorCode.FLOOR_NOT_EMPTY,
          message: "Remove the floor's areas before deleting it",
        })
      }
    }
    await this.prisma.floor.delete({ where: { id } })
  }

  private async getFloorOrThrow(id: string) {
    const floor = await this.prisma.floor.findUnique({ where: { id } })
    if (!floor) {
      throw new NotFoundException({
        code: ErrorCode.FLOOR_NOT_FOUND,
        message: `Floor with id "${id}" was not found`,
      })
    }
    return floor
  }
}

function restaurantNotFound(slug: string) {
  return new NotFoundException({
    code: ErrorCode.RESTAURANT_NOT_FOUND,
    message: `Restaurant with slug "${slug}" was not found`,
  })
}

function floorNameTaken(name: string) {
  return new ConflictException({
    code: ErrorCode.FLOOR_NAME_TAKEN,
    message: `Floor name "${name}" is already taken in this restaurant`,
  })
}
