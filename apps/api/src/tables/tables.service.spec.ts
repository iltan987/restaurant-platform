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
      findUnique: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
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
        findUnique: jest.fn().mockResolvedValue({
          id: "a1",
          floorId: "f1",
          floor: { restaurantId: "r1" },
        }),
      },
      table: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          id: "t1",
          label: "1",
          areaId: "a1",
          area: { floorId: "f1" },
        }),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(({ data }: { data: object }) =>
          Promise.resolve({ id: "t", ...data })
        ),
        update: jest.fn(({ data }: { data: object }) =>
          Promise.resolve({ id: "t1", ...data })
        ),
        delete: jest.fn().mockResolvedValue({ id: "t1" }),
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

    it("throws TABLE_LIMIT_REACHED at the per-restaurant ceiling", async () => {
      prismaMock.table.count.mockResolvedValue(500)
      const err = await service.create("a1", { label: "x" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LIMIT_REACHED,
      })
      expect(prismaMock.table.create).not.toHaveBeenCalled()
    })

    it("throws TABLE_LABEL_TAKEN when the label exists on the floor (scoped per floor)", async () => {
      prismaMock.table.findFirst.mockResolvedValue({ label: "5" })
      const err = await service.create("a1", { label: "5" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LABEL_TAKEN,
      })
      // uniqueness is scoped to the floor, not the whole restaurant
      expect(prismaMock.table.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { label: { in: ["5"] }, area: { floorId: "f1" } },
        })
      )
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

    it("prefixes labels with the area's code", async () => {
      prismaMock.area.findUnique.mockResolvedValue({
        id: "a1",
        floorId: "f1",
        code: "B",
        floor: { restaurantId: "r1" },
      })
      await service.bulkCreate("a1", { count: 2 })
      expect(txTableCreate.mock.calls.map((c) => c[0].data.label)).toEqual([
        "B1",
        "B2",
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

    it("rejects a batch that would exceed the per-restaurant ceiling", async () => {
      prismaMock.table.count.mockResolvedValue(499)
      const err = await service.bulkCreate("a1", { count: 2 }).catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LIMIT_REACHED,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })

  describe("update", () => {
    it("renames a table", async () => {
      await service.update("t1", { label: "42" })
      expect(prismaMock.table.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { label: "42" },
      })
    })

    it("throws TABLE_NOT_FOUND for an unknown table", async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      const err = await service.update("nope", { label: "x" }).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
      expect(prismaMock.table.update).not.toHaveBeenCalled()
    })

    it("checks rename uniqueness on the floor, excluding itself", async () => {
      await service.update("t1", { label: "42" })
      expect(prismaMock.table.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            label: { in: ["42"] },
            area: { floorId: "f1" },
            id: { not: "t1" },
          },
        })
      )
    })

    it("rejects a rename that collides on the floor", async () => {
      prismaMock.table.findFirst.mockResolvedValue({ label: "42" })
      const err = await service.update("t1", { label: "42" }).catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.TABLE_LABEL_TAKEN,
      })
      expect(prismaMock.table.update).not.toHaveBeenCalled()
    })

    it("skips the uniqueness check when the label is unchanged", async () => {
      await service.update("t1", { label: "1" })
      expect(prismaMock.table.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.table.update).toHaveBeenCalled()
    })

    it("reassigns area, re-checking the label on the destination floor", async () => {
      // moving table t1 (floor f1) into area a2 on floor f2
      prismaMock.area.findUnique.mockResolvedValue({
        id: "a2",
        floorId: "f2",
        floor: { restaurantId: "r1" },
      })
      await service.update("t1", { areaId: "a2" })
      expect(prismaMock.table.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            label: { in: ["1"] },
            area: { floorId: "f2" },
            id: { not: "t1" },
          },
        })
      )
      expect(prismaMock.table.update).toHaveBeenCalled()
    })

    it("throws AREA_NOT_FOUND when reassigning to a missing area", async () => {
      prismaMock.area.findUnique.mockResolvedValue(null)
      const err = await service.update("t1", { areaId: "nope" }).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NOT_FOUND })
      expect(prismaMock.table.update).not.toHaveBeenCalled()
    })
  })

  describe("remove", () => {
    it("deletes an existing table", async () => {
      await service.remove("t1")
      expect(prismaMock.table.delete).toHaveBeenCalledWith({
        where: { id: "t1" },
      })
    })

    it("throws TABLE_NOT_FOUND for an unknown table", async () => {
      prismaMock.table.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
      expect(prismaMock.table.delete).not.toHaveBeenCalled()
    })
  })
})
