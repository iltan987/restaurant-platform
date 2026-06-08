import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { FloorsService } from "./floors.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("FloorsService", () => {
  let service: FloorsService
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    floor: {
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
    area: { count: jest.Mock }
  }

  beforeEach(async () => {
    prismaMock = {
      restaurant: { findUnique: jest.fn().mockResolvedValue({ id: "r1" }) },
      floor: {
        findUnique: jest.fn().mockResolvedValue({ id: "f1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "f1", name: "1. Kat" }),
        update: jest.fn().mockResolvedValue({ id: "f1", name: "1. Kat" }),
        delete: jest.fn().mockResolvedValue({ id: "f1" }),
      },
      area: { count: jest.fn().mockResolvedValue(0) },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(FloorsService)
  })

  describe("create", () => {
    it("creates a floor under an existing restaurant", async () => {
      await service.create("r1", { name: "1. Kat" })
      expect(prismaMock.floor.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", name: "1. Kat", position: 0 },
      })
    })

    it("throws RESTAURANT_NOT_FOUND when the restaurant is missing", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(null)
      const err = await service.create("nope", { name: "X" }).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })

    it("throws FLOOR_NAME_TAKEN on a P2002 collision", async () => {
      prismaMock.floor.create.mockRejectedValue({ code: "P2002" })
      const err = await service.create("r1", { name: "Dup" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.FLOOR_NAME_TAKEN,
      })
    })
  })

  describe("remove", () => {
    it("throws FLOOR_NOT_FOUND when the floor is missing", async () => {
      prismaMock.floor.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.FLOOR_NOT_FOUND })
    })

    it("throws FLOOR_NOT_EMPTY when the floor still has areas", async () => {
      prismaMock.area.count.mockResolvedValue(2)
      const err = await service.remove("f1").catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.FLOOR_NOT_EMPTY })
      expect(prismaMock.floor.delete).not.toHaveBeenCalled()
    })

    it("deletes an empty floor", async () => {
      await service.remove("f1")
      expect(prismaMock.floor.delete).toHaveBeenCalledWith({
        where: { id: "f1" },
      })
    })
  })

  describe("findAllBySlug", () => {
    it("throws RESTAURANT_NOT_FOUND for an unknown slug", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(null)
      const err = await service.findAllBySlug("nope").catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })

    it("returns a paginated envelope ordered by position", async () => {
      prismaMock.floor.findMany.mockResolvedValue([{ id: "f1" }])
      prismaMock.floor.count.mockResolvedValue(1)
      const result = await service.findAllBySlug("kose", 1, 200)
      expect(prismaMock.floor.findMany).toHaveBeenCalledWith({
        where: { restaurantId: "r1" },
        orderBy: { position: "asc" },
        skip: 0,
        take: 200,
      })
      expect(result).toEqual({
        items: [{ id: "f1" }],
        total: 1,
        page: 1,
        pageSize: 200,
      })
    })
  })
})
