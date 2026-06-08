import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  type CreateTableInput,
  type CreateTablesBulkInput,
  ErrorCode,
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
    const restaurantId = await this.resolveRestaurantId(areaId)
    await this.assertLabelsFree(restaurantId, [input.label])

    return this.prisma.table.create({
      data: {
        areaId,
        label: input.label,
        capacity: input.capacity ?? null,
      },
    })
  }

  async bulkCreate(areaId: string, input: CreateTablesBulkInput) {
    const restaurantId = await this.resolveRestaurantId(areaId)
    const start = input.startNumber ?? 1
    const prefix = input.labelPrefix ?? ""
    const labels = Array.from(
      { length: input.count },
      (_, i) => `${prefix}${start + i}`
    )

    await this.assertLabelsFree(restaurantId, labels)

    return this.prisma.$transaction((tx) =>
      Promise.all(
        labels.map((label) => tx.table.create({ data: { areaId, label } }))
      )
    )
  }

  /** Resolves the owning restaurant via area → floor, or throws AREA_NOT_FOUND. */
  private async resolveRestaurantId(areaId: string): Promise<string> {
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
    return area.floor.restaurantId
  }

  /** Table labels are unique per restaurant (FR — service-enforced). */
  private async assertLabelsFree(restaurantId: string, labels: string[]) {
    const clash = await this.prisma.table.findFirst({
      where: {
        label: { in: labels },
        area: { floor: { restaurantId } },
      },
      select: { label: true },
    })
    if (clash) {
      throw new ConflictException({
        code: ErrorCode.TABLE_LABEL_TAKEN,
        message: `Table label "${clash.label}" is already taken in this restaurant`,
      })
    }
  }
}
