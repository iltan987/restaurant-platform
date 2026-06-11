import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { isValidGroupRule } from "@repo/core"
import {
  type CreateOptionGroupInput,
  type CreateOptionInput,
  ErrorCode,
  type UpdateOptionGroupInput,
  type UpdateOptionInput,
} from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

const withOptions = {
  include: { options: { orderBy: { position: "asc" as const } } },
}

@Injectable()
export class OptionGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Groups ──────────────────────────────────────────────────────────────

  async createGroup(itemId: string, input: CreateOptionGroupInput) {
    await this.getItemOrThrow(itemId)
    const rule = {
      minSelect: input.minSelect,
      maxSelect: input.maxSelect ?? null,
      required: input.required,
    }
    if (!isValidGroupRule(rule)) throw invalidOptionConfig()

    const position = await this.prisma.optionGroup.count({ where: { itemId } })
    return this.prisma.optionGroup.create({
      data: { itemId, name: input.name, position, ...rule },
      ...withOptions,
    })
  }

  async updateGroup(groupId: string, input: UpdateOptionGroupInput) {
    const group = await this.getGroupOrThrow(groupId)
    const rule = {
      minSelect: input.minSelect ?? group.minSelect,
      maxSelect:
        input.maxSelect !== undefined ? input.maxSelect : group.maxSelect,
      required: input.required ?? group.required,
    }
    if (!isValidGroupRule(rule)) throw invalidOptionConfig()

    return this.prisma.optionGroup.update({
      where: { id: groupId },
      data: { ...input },
      ...withOptions,
    })
  }

  async removeGroup(groupId: string) {
    await this.getGroupOrThrow(groupId)
    await this.prisma.optionGroup.delete({ where: { id: groupId } })
  }

  async reorderGroups(itemId: string, ids: string[]) {
    await this.getItemOrThrow(itemId)
    const owned = await this.prisma.optionGroup.findMany({
      where: { id: { in: ids }, itemId },
      select: { id: true },
    })
    const known = new Set(owned.map((g) => g.id))
    const stray = ids.find((id) => !known.has(id))
    if (stray) throw groupNotFound(stray)

    await this.prisma.$transaction((tx) =>
      Promise.all(
        ids.map((id, index) =>
          tx.optionGroup.update({ where: { id }, data: { position: index } })
        )
      )
    )
    return this.prisma.optionGroup.findMany({
      where: { itemId },
      orderBy: { position: "asc" },
      ...withOptions,
    })
  }

  // ── Options ─────────────────────────────────────────────────────────────

  async createOption(groupId: string, input: CreateOptionInput) {
    await this.getGroupOrThrow(groupId)
    const position = await this.prisma.option.count({ where: { groupId } })
    return this.prisma.option.create({
      data: {
        groupId,
        name: input.name,
        priceDeltaMinor: input.priceDeltaMinor,
        defaultSelected: input.defaultSelected,
        isAvailable: input.isAvailable,
        position,
      },
    })
  }

  async updateOption(optionId: string, input: UpdateOptionInput) {
    await this.getOptionOrThrow(optionId)
    return this.prisma.option.update({ where: { id: optionId }, data: input })
  }

  async removeOption(optionId: string) {
    await this.getOptionOrThrow(optionId)
    await this.prisma.option.delete({ where: { id: optionId } })
  }

  async reorderOptions(groupId: string, ids: string[]) {
    await this.getGroupOrThrow(groupId)
    const owned = await this.prisma.option.findMany({
      where: { id: { in: ids }, groupId },
      select: { id: true },
    })
    const known = new Set(owned.map((o) => o.id))
    const stray = ids.find((id) => !known.has(id))
    if (stray) throw optionNotFound(stray)

    await this.prisma.$transaction((tx) =>
      Promise.all(
        ids.map((id, index) =>
          tx.option.update({ where: { id }, data: { position: index } })
        )
      )
    )
    return this.prisma.option.findMany({
      where: { groupId },
      orderBy: { position: "asc" },
    })
  }

  // ── Guards ──────────────────────────────────────────────────────────────

  private async getItemOrThrow(itemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
    })
    if (!item) {
      throw new NotFoundException({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
        message: `Menu item with id "${itemId}" was not found`,
      })
    }
    return item
  }

  private async getGroupOrThrow(groupId: string) {
    const group = await this.prisma.optionGroup.findUnique({
      where: { id: groupId },
    })
    if (!group) throw groupNotFound(groupId)
    return group
  }

  private async getOptionOrThrow(optionId: string) {
    const option = await this.prisma.option.findUnique({
      where: { id: optionId },
    })
    if (!option) throw optionNotFound(optionId)
    return option
  }
}

function invalidOptionConfig() {
  return new BadRequestException({
    code: ErrorCode.INVALID_OPTION_CONFIG,
    message:
      "Option group rule is inconsistent (maxSelect must be ≥ max(1, minSelect); a required group needs minSelect ≥ 1)",
  })
}

function groupNotFound(id: string) {
  return new NotFoundException({
    code: ErrorCode.OPTION_GROUP_NOT_FOUND,
    message: `Option group with id "${id}" was not found`,
  })
}

function optionNotFound(id: string) {
  return new NotFoundException({
    code: ErrorCode.OPTION_NOT_FOUND,
    message: `Option with id "${id}" was not found`,
  })
}
