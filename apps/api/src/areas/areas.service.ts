import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateAreaInput,
  ErrorCode,
  type UpdateAreaInput,
} from "@repo/schemas"

import { isP2002 } from "../common/prisma-error"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySlug(
    slug: string,
    page = 1,
    pageSize = 200,
    floorId?: string
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with slug "${slug}" was not found`,
      })
    }

    const where = {
      floor: { restaurantId: restaurant.id },
      ...(floorId ? { floorId } : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.area.findMany({
        where,
        orderBy: { position: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.area.count({ where }),
    ])
    return { items, total, page, pageSize }
  }

  async create(floorId: string, input: CreateAreaInput) {
    const floor = await this.prisma.floor.findUnique({ where: { id: floorId } })
    if (!floor) {
      throw new NotFoundException({
        code: ErrorCode.FLOOR_NOT_FOUND,
        message: `Floor with id "${floorId}" was not found`,
      })
    }

    try {
      return await this.prisma.area.create({
        data: { floorId, name: input.name, position: input.position ?? 0 },
      })
    } catch (err: unknown) {
      if (isP2002(err)) throw areaNameTaken(input.name)
      throw err
    }
  }

  async update(id: string, input: UpdateAreaInput) {
    await this.getAreaOrThrow(id)
    try {
      return await this.prisma.area.update({ where: { id }, data: input })
    } catch (err: unknown) {
      if (isP2002(err)) throw areaNameTaken(input.name ?? "")
      throw err
    }
  }

  async remove(id: string) {
    await this.getAreaOrThrow(id)
    const tableCount = await this.prisma.table.count({ where: { areaId: id } })
    if (tableCount > 0) {
      throw new ConflictException({
        code: ErrorCode.AREA_NOT_EMPTY,
        message: "Remove the area's tables before deleting it",
      })
    }
    await this.prisma.area.delete({ where: { id } })
  }

  private async getAreaOrThrow(id: string) {
    const area = await this.prisma.area.findUnique({ where: { id } })
    if (!area) {
      throw new NotFoundException({
        code: ErrorCode.AREA_NOT_FOUND,
        message: `Area with id "${id}" was not found`,
      })
    }
    return area
  }
}

function areaNameTaken(name: string) {
  return new ConflictException({
    code: ErrorCode.AREA_NAME_TAKEN,
    message: `Area name "${name}" is already taken on this floor`,
  })
}
