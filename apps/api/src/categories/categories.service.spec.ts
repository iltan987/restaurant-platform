import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { CategoriesService } from "./categories.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("CategoriesService", () => {
  let service: CategoriesService
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    category: {
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
    menuItem: { count: jest.Mock }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    prismaMock = {
      restaurant: { findUnique: jest.fn().mockResolvedValue({ id: "r1" }) },
      category: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "c1", restaurantId: "r1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "c1", name: "İçecekler" }),
        update: jest.fn().mockResolvedValue({ id: "c1", name: "İçecekler" }),
        delete: jest.fn().mockResolvedValue({ id: "c1" }),
      },
      menuItem: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(CategoriesService)
  })

  describe("create", () => {
    it("appends a category at the end of the current order", async () => {
      prismaMock.category.count.mockResolvedValue(3)
      await service.create("r1", { name: "İçecekler" })
      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", name: "İçecekler", position: 3 },
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

    it("throws CATEGORY_NAME_TAKEN on a P2002 collision", async () => {
      prismaMock.category.create.mockRejectedValue({ code: "P2002" })
      const err = await service.create("r1", { name: "Dup" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.CATEGORY_NAME_TAKEN,
      })
    })
  })

  describe("remove", () => {
    it("throws CATEGORY_NOT_FOUND when the category is missing", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.CATEGORY_NOT_FOUND,
      })
    })

    it("throws CATEGORY_NOT_EMPTY when the category still has items", async () => {
      prismaMock.menuItem.count.mockResolvedValue(2)
      const err = await service.remove("c1").catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.CATEGORY_NOT_EMPTY,
      })
      expect(prismaMock.category.delete).not.toHaveBeenCalled()
    })

    it("deletes an empty category", async () => {
      await service.remove("c1")
      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: "c1" },
      })
    })
  })

  describe("reorder", () => {
    it("assigns position from array index for owned categories", async () => {
      prismaMock.category.findMany
        .mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }])
        .mockResolvedValueOnce([{ id: "c2" }, { id: "c1" }])
      await service.reorder("r1", ["c2", "c1"])
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: "c2" },
        data: { position: 0 },
      })
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: { position: 1 },
      })
    })

    it("throws CATEGORY_NOT_FOUND when an id is not in the restaurant", async () => {
      prismaMock.category.findMany.mockResolvedValueOnce([{ id: "c1" }])
      const err = await service.reorder("r1", ["c1", "ghost"]).catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.CATEGORY_NOT_FOUND,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })
})
