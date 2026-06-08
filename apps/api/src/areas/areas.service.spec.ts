import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { AreasService } from "./areas.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("AreasService", () => {
  let service: AreasService
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    floor: { findUnique: jest.Mock }
    area: {
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
    table: { count: jest.Mock }
  }

  beforeEach(async () => {
    prismaMock = {
      restaurant: { findUnique: jest.fn().mockResolvedValue({ id: "r1" }) },
      floor: { findUnique: jest.fn().mockResolvedValue({ id: "f1" }) },
      area: {
        findUnique: jest.fn().mockResolvedValue({ id: "a1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "a1", name: "Teras" }),
        update: jest.fn().mockResolvedValue({ id: "a1", name: "Teras" }),
        delete: jest.fn().mockResolvedValue({ id: "a1" }),
      },
      table: { count: jest.fn().mockResolvedValue(0) },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(AreasService)
  })

  describe("create", () => {
    it("creates an area under an existing floor", async () => {
      await service.create("f1", { name: "Teras" })
      expect(prismaMock.area.create).toHaveBeenCalledWith({
        data: { floorId: "f1", name: "Teras", position: 0 },
      })
    })

    it("throws FLOOR_NOT_FOUND when the floor is missing", async () => {
      prismaMock.floor.findUnique.mockResolvedValue(null)
      const err = await service.create("nope", { name: "X" }).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.FLOOR_NOT_FOUND })
    })

    it("throws AREA_NAME_TAKEN on a P2002 collision within the floor", async () => {
      prismaMock.area.create.mockRejectedValue({ code: "P2002" })
      const err = await service.create("f1", { name: "Dup" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NAME_TAKEN })
    })

    it("allows the same area name on a different floor", async () => {
      await service.create("f1", { name: "Bahçe" })
      await service.create("f2", { name: "Bahçe" })
      expect(prismaMock.area.create).toHaveBeenCalledTimes(2)
    })
  })

  describe("remove", () => {
    it("throws AREA_NOT_FOUND when the area is missing", async () => {
      prismaMock.area.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NOT_FOUND })
    })

    it("throws AREA_NOT_EMPTY when the area still has tables", async () => {
      prismaMock.table.count.mockResolvedValue(3)
      const err = await service.remove("a1").catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.AREA_NOT_EMPTY })
      expect(prismaMock.area.delete).not.toHaveBeenCalled()
    })

    it("deletes an empty area", async () => {
      await service.remove("a1")
      expect(prismaMock.area.delete).toHaveBeenCalledWith({
        where: { id: "a1" },
      })
    })
  })
})
