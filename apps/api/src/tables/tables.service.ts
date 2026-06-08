import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateTableInput,
  type CreateTablesBulkInput,
  ErrorCode,
  TABLE_LIMIT_PER_RESTAURANT,
  type UpdateTableInput,
} from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBySlug(slug: string, page = 1, pageSize = 200) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with slug "${slug}" was not found`,
      })
    }

    const where = { area: { floor: { restaurantId: restaurant.id } } }
    const [items, total] = await Promise.all([
      this.prisma.table.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.table.count({ where }),
    ])
    return { items, total, page, pageSize }
  }

  async create(areaId: string, input: CreateTableInput) {
    const area = await this.getAreaOrThrow(areaId)
    await this.assertWithinLimit(area.floor.restaurantId, 1)
    await this.assertLabelsFree(area.floorId, [input.label])

    return this.prisma.table.create({
      data: {
        areaId,
        label: input.label,
        capacity: input.capacity ?? null,
      },
    })
  }

  async bulkCreate(areaId: string, input: CreateTablesBulkInput) {
    const area = await this.getAreaOrThrow(areaId)
    await this.assertWithinLimit(area.floor.restaurantId, input.count)
    const start = input.startNumber ?? 1
    // The area's own code prefixes the labels (e.g. "B1"); the client can also
    // pass a one-off prefix when an area has no stored code.
    const prefix = area.code ?? input.labelPrefix ?? ""
    const labels = Array.from(
      { length: input.count },
      (_, i) => `${prefix}${start + i}`
    )

    await this.assertLabelsFree(area.floorId, labels)

    return this.prisma.$transaction((tx) =>
      Promise.all(
        labels.map((label) => tx.table.create({ data: { areaId, label } }))
      )
    )
  }

  async update(id: string, input: UpdateTableInput) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { area: { select: { floorId: true } } },
    })
    if (!table) {
      throw new NotFoundException({
        code: ErrorCode.TABLE_NOT_FOUND,
        message: `Table with id "${id}" was not found`,
      })
    }
    // A rename must stay unique on the floor; exclude this table from the check.
    if (input.label && input.label !== table.label) {
      await this.assertLabelsFree(table.area.floorId, [input.label], id)
    }
    return this.prisma.table.update({ where: { id }, data: input })
  }

  async remove(id: string) {
    const table = await this.prisma.table.findUnique({ where: { id } })
    if (!table) {
      throw new NotFoundException({
        code: ErrorCode.TABLE_NOT_FOUND,
        message: `Table with id "${id}" was not found`,
      })
    }
    await this.prisma.table.delete({ where: { id } })
  }

  /** Loads the area (with its floor's restaurant + code), or throws AREA_NOT_FOUND. */
  private async getAreaOrThrow(areaId: string) {
    const area = await this.prisma.area.findUnique({
      where: { id: areaId },
      include: { floor: { select: { restaurantId: true } } },
    })
    if (!area) {
      throw new NotFoundException({
        code: ErrorCode.AREA_NOT_FOUND,
        message: `Area with id "${areaId}" was not found`,
      })
    }
    return area
  }

  /**
   * Guards the per-restaurant table ceiling (anti-spam). `adding` is how many
   * new tables this request would create.
   */
  private async assertWithinLimit(restaurantId: string, adding: number) {
    const existing = await this.prisma.table.count({
      where: { area: { floor: { restaurantId } } },
    })
    if (existing + adding > TABLE_LIMIT_PER_RESTAURANT) {
      throw new ConflictException({
        code: ErrorCode.TABLE_LIMIT_REACHED,
        message: `A restaurant can have at most ${TABLE_LIMIT_PER_RESTAURANT} tables (has ${existing}, tried to add ${adding})`,
      })
    }
  }

  /**
   * Table labels are unique per floor (service-enforced) — the same number can
   * repeat on different floors; an optional area prefix lets areas on one floor
   * carry their own sequence (e.g. "B1", "S1").
   */
  private async assertLabelsFree(
    floorId: string,
    labels: string[],
    exceptId?: string
  ) {
    const clash = await this.prisma.table.findFirst({
      where: {
        label: { in: labels },
        area: { floorId },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { label: true },
    })
    if (clash) {
      throw new ConflictException({
        code: ErrorCode.TABLE_LABEL_TAKEN,
        message: `Table label "${clash.label}" is already taken on this floor`,
      })
    }
  }
}
