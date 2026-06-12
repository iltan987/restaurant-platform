import { Test, TestingModule } from "@nestjs/testing"

import { PrismaService } from "../prisma/prisma.service"
import { ActivityService } from "./activity.service"

describe("ActivityService", () => {
  let service: ActivityService
  let mockActivity: {
    create: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
  }

  beforeEach(async () => {
    mockActivity = {
      create: jest.fn().mockResolvedValue({ id: "a1" }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: { activity: mockActivity } },
      ],
    }).compile()

    service = module.get(ActivityService)
  })

  describe("record", () => {
    it("writes one row with type, restaurantId and meta", async () => {
      await service.record({
        type: "PLAN_CHANGED",
        restaurantId: "r1",
        meta: { from: "FREE", to: "PRO" },
      })

      expect(mockActivity.create).toHaveBeenCalledWith({
        data: {
          type: "PLAN_CHANGED",
          restaurantId: "r1",
          meta: { from: "FREE", to: "PRO" },
        },
      })
    })

    it("defaults restaurantId to null and meta to undefined", async () => {
      await service.record({ type: "RESTAURANT_CREATED" })

      expect(mockActivity.create).toHaveBeenCalledWith({
        data: {
          type: "RESTAURANT_CREATED",
          restaurantId: null,
          meta: undefined,
        },
      })
    })

    it("is best-effort — a DB failure never propagates to the caller", async () => {
      mockActivity.create.mockRejectedValue(new Error("db down"))

      await expect(
        service.record({ type: "STATUS_CHANGED", restaurantId: "r1" })
      ).resolves.toBeUndefined()
    })
  })

  describe("findAll", () => {
    it("returns a paginated envelope ordered newest-first", async () => {
      mockActivity.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }])
      mockActivity.count.mockResolvedValue(2)

      const result = await service.findAll(2, 10)

      expect(mockActivity.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 10,
      })
      expect(result).toEqual({
        items: [{ id: "a1" }, { id: "a2" }],
        total: 2,
        page: 2,
        pageSize: 10,
      })
    })
  })

  describe("findByRestaurant", () => {
    it("filters by the restaurant slug", async () => {
      await service.findByRestaurant("burger-joint", 1, 30)

      const where = { restaurant: { slug: "burger-joint" } }
      expect(mockActivity.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 30,
      })
      expect(mockActivity.count).toHaveBeenCalledWith({ where })
    })
  })
})
