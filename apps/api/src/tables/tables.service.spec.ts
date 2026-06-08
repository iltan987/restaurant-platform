import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { TablesService } from "./tables.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("TablesService", () => {
  let service: TablesService
  let txTableCreate: jest.Mock
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    area: { findUnique: jest.Mock }
    table: {
      findFirst: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    txTableCreate = jest.fn(({ data }: { data: object }) =>
      Promise.resolve({ id: "t", ...data })
    )
    prismaMock = {
      restaurant: { findUnique: jest.fn().mockResolvedValue({ id: "r1" }) },
      area: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "a1", floor: { restaurantId: "r1" } }),
      },
      table: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(({ data }: { data: object }) =>
          Promise.resolve({ id: "t", ...data })
        ),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({ table: { create: txTableCreate } })
      ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(TablesService)
  })

  describe("create", () => {
    it("creates a table in an area (capacity defaults to null)", async () => {
      await service.create("a1", { label: "5" })
      expect(prismaMock.table.create).toHaveBeenCalledWith({
        data: { areaId: "a1", label: "5", capacity: null },
      })
    })

    it("throws AREA_NOT_FOUND when the area is missing", async () => {
      prismaMock.area.findUnique.mockResolvedValue(null)
      const err = await service.create("nope", { label: "1" }).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NOT_FOUND })
    })

    it("throws TABLE_LABEL_TAKEN when the label exists in the restaurant", async () => {
      prismaMock.table.findFirst.mockResolvedValue({ label: "5" })
      const err = await service.create("a1", { label: "5" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LABEL_TAKEN,
      })
      expect(prismaMock.table.create).not.toHaveBeenCalled()
    })
  })

  describe("bulkCreate", () => {
    it("creates sequential labels into the area atomically", async () => {
      await service.bulkCreate("a1", { count: 3 })
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(txTableCreate).toHaveBeenCalledTimes(3)
      expect(txTableCreate.mock.calls.map((c) => c[0].data.label)).toEqual([
        "1",
        "2",
        "3",
      ])
    })

    it("honours startNumber and labelPrefix", async () => {
      await service.bulkCreate("a1", {
        count: 2,
        startNumber: 10,
        labelPrefix: "B",
      })
      expect(txTableCreate.mock.calls.map((c) => c[0].data.label)).toEqual([
        "B10",
        "B11",
      ])
    })

    it("aborts the whole batch with TABLE_LABEL_TAKEN on any collision", async () => {
      prismaMock.table.findFirst.mockResolvedValue({ label: "2" })
      const err = await service.bulkCreate("a1", { count: 3 }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LABEL_TAKEN,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
      expect(txTableCreate).not.toHaveBeenCalled()
    })

    it("throws AREA_NOT_FOUND when the area is missing", async () => {
      prismaMock.area.findUnique.mockResolvedValue(null)
      const err = await service.bulkCreate("nope", { count: 2 }).catch((e) => e)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NOT_FOUND })
    })
  })
})
