import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { isValidWindow } from "@repo/core"
import { type AvailabilityWindowInput, ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replaces an item's availability windows wholesale (the editor sends the
   * full set; an empty array means "always available"). Each window's rule is
   * validated before anything is written.
   */
  async setWindows(itemId: string, windows: AvailabilityWindowInput[]) {
    await this.getItemOrThrow(itemId)

    for (const window of windows) {
      if (!isValidWindow(window)) {
        throw new BadRequestException({
          code: ErrorCode.AVAILABILITY_WINDOW_INVALID,
          message:
            "A window needs ≥1 day, times in 0–1439, and start ≠ end (end < start crosses midnight)",
        })
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.availabilityWindow.deleteMany({ where: { itemId } })
      if (windows.length > 0) {
        await tx.availabilityWindow.createMany({
          data: windows.map((w) => ({
            itemId,
            days: w.days,
            startMin: w.startMin,
            endMin: w.endMin,
          })),
        })
      }
      return tx.availabilityWindow.findMany({
        where: { itemId },
        orderBy: { startMin: "asc" },
      })
    })
  }

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
}
