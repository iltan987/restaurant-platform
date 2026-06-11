import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { S3Service } from "../storage/s3.service"
import { MenuItemsService } from "./menu-items.service"

const responseOf = (err: unknown) => (err as NotFoundException).getResponse()

describe("MenuItemsService", () => {
  let service: MenuItemsService
  let prismaMock: {
    category: { findUnique: jest.Mock }
    menuItem: {
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    prismaMock = {
      category: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "c1", restaurantId: "r1" }),
      },
      menuItem: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "i1", categoryId: "c1", inStock: true }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "i1", name: "Çay" }),
        update: jest.fn().mockResolvedValue({ id: "i1", name: "Çay" }),
        delete: jest.fn().mockResolvedValue({ id: "i1" }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuItemsService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: S3Service,
          useValue: { publicUrl: (key: string) => `http://media/${key}` },
        },
      ],
    }).compile()

    service = module.get(MenuItemsService)
  })

  describe("create", () => {
    it("creates an item with the category's restaurantId, defaulting inStock", async () => {
      prismaMock.menuItem.count.mockResolvedValue(2)
      await service.create("c1", { name: "Çay", priceMinor: 1000 })
      expect(prismaMock.menuItem.create).toHaveBeenCalledWith({
        data: {
          restaurantId: "r1",
          categoryId: "c1",
          name: "Çay",
          priceMinor: 1000,
          inStock: true,
          position: 2,
          description: null,
          calories: null,
          servingAmount: null,
          servingUnit: null,
          unitPriceBasis: "AUTO",
        },
      })
    })

    it("throws CATEGORY_NOT_FOUND when the category is missing", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null)
      const err = await service
        .create("nope", { name: "X", priceMinor: 0 })
        .catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.CATEGORY_NOT_FOUND,
      })
    })
  })

  describe("update", () => {
    it("toggles in-stock without deleting the item", async () => {
      await service.update("i1", { inStock: false })
      expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: { inStock: false },
      })
    })

    it("throws MENU_ITEM_NOT_FOUND when the item is missing", async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(null)
      const err = await service
        .update("nope", { inStock: false })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
      })
    })
  })

  describe("reorder", () => {
    it("assigns position from array index within the category", async () => {
      prismaMock.menuItem.findMany
        .mockResolvedValueOnce([{ id: "i1" }, { id: "i2" }])
        .mockResolvedValueOnce([{ id: "i2" }, { id: "i1" }])
      await service.reorder("c1", ["i2", "i1"])
      expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
        where: { id: "i2" },
        data: { position: 0 },
      })
      expect(prismaMock.menuItem.update).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: { position: 1 },
      })
    })

    it("throws MENU_ITEM_NOT_FOUND when an id is not in the category", async () => {
      prismaMock.menuItem.findMany.mockResolvedValueOnce([{ id: "i1" }])
      const err = await service.reorder("c1", ["i1", "ghost"]).catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })
})
