import { BadRequestException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { AvailabilityService } from "./availability.service"

const responseOf = (err: unknown) =>
  (err as BadRequestException | NotFoundException).getResponse()

describe("AvailabilityService", () => {
  let service: AvailabilityService
  let prismaMock: {
    menuItem: { findUnique: jest.Mock }
    availabilityWindow: {
      deleteMany: jest.Mock
      createMany: jest.Mock
      findMany: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    prismaMock = {
      menuItem: { findUnique: jest.fn().mockResolvedValue({ id: "i1" }) },
      availabilityWindow: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(AvailabilityService)
  })

  it("replaces windows: clears then re-creates", async () => {
    await service.setWindows("i1", [
      { days: ["MON", "FRI"], startMin: 900, endMin: 960 },
    ])
    expect(prismaMock.availabilityWindow.deleteMany).toHaveBeenCalledWith({
      where: { itemId: "i1" },
    })
    expect(prismaMock.availabilityWindow.createMany).toHaveBeenCalledWith({
      data: [
        { itemId: "i1", days: ["MON", "FRI"], startMin: 900, endMin: 960 },
      ],
    })
  })

  it("clears all windows for an empty set (always available) without creating", async () => {
    await service.setWindows("i1", [])
    expect(prismaMock.availabilityWindow.deleteMany).toHaveBeenCalled()
    expect(prismaMock.availabilityWindow.createMany).not.toHaveBeenCalled()
  })

  it("rejects an invalid window (start === end) before writing", async () => {
    const err = await service
      .setWindows("i1", [{ days: ["MON"], startMin: 600, endMin: 600 }])
      .catch((e) => e)
    expect(err).toBeInstanceOf(BadRequestException)
    expect(responseOf(err)).toMatchObject({
      code: ErrorCode.AVAILABILITY_WINDOW_INVALID,
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it("rejects a window with no days", async () => {
    const err = await service
      .setWindows("i1", [{ days: [], startMin: 0, endMin: 60 }])
      .catch((e) => e)
    expect(responseOf(err)).toMatchObject({
      code: ErrorCode.AVAILABILITY_WINDOW_INVALID,
    })
  })

  it("throws MENU_ITEM_NOT_FOUND when the item is missing", async () => {
    prismaMock.menuItem.findUnique.mockResolvedValue(null)
    const err = await service.setWindows("nope", []).catch((e) => e)
    expect(responseOf(err)).toMatchObject({
      code: ErrorCode.MENU_ITEM_NOT_FOUND,
    })
  })
})
