import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { RestaurantsService } from "./restaurants.service"

const makeRow = (
  overrides: Partial<{
    id: string
    name: string
    slug: string
    status: "ACTIVE" | "INACTIVE"
    onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
    createdAt: Date
    updatedAt: Date
  }> = {}
) => ({
  id: "cuid-1",
  name: "Burger Joint",
  slug: "burger-joint",
  status: "INACTIVE" as const,
  onboardingStatus: "IN_PROGRESS" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe("RestaurantsService", () => {
  let service: RestaurantsService
  let mockRestaurant: {
    create: jest.Mock
    findMany: jest.Mock
    findUnique: jest.Mock
    count: jest.Mock
  }
  let mockFloor: { create: jest.Mock }
  let mockArea: { create: jest.Mock }
  let prismaMock: {
    restaurant: typeof mockRestaurant
    floor: typeof mockFloor
    area: typeof mockArea
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    mockRestaurant = {
      create: jest.fn().mockResolvedValue(makeRow()),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    }
    mockFloor = { create: jest.fn().mockResolvedValue({ id: "floor-1" }) }
    mockArea = { create: jest.fn().mockResolvedValue({ id: "area-1" }) }
    prismaMock = {
      restaurant: mockRestaurant,
      floor: mockFloor,
      area: mockArea,
      // Interactive transaction — invoke the callback with the same delegates.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({ restaurant: mockRestaurant, floor: mockFloor, area: mockArea })
      ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get<RestaurantsService>(RestaurantsService)
  })

  describe("create", () => {
    it("creates the restaurant with a default floor + area in one transaction (INACTIVE / IN_PROGRESS)", async () => {
      const row = makeRow({ name: "Burger Joint", slug: "burger-joint" })
      mockRestaurant.create.mockResolvedValue(row)

      const result = await service.create({ name: "Burger Joint" })

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
      expect(mockRestaurant.create).toHaveBeenCalledWith({
        data: { name: "Burger Joint", slug: "burger-joint" },
      })
      expect(mockFloor.create).toHaveBeenCalledWith({
        data: { restaurantId: row.id, name: "Zemin Kat" },
      })
      expect(mockArea.create).toHaveBeenCalledWith({
        data: { floorId: "floor-1", name: "Genel" },
      })
      expect(result).toBe(row)
      expect(result.status).toBe("INACTIVE")
      expect(result.onboardingStatus).toBe("IN_PROGRESS")
    })

    it("uses the provided slug instead of deriving one from the name", async () => {
      await service.create({ name: "Burger Joint", slug: "bj" })

      expect(mockRestaurant.create).toHaveBeenCalledWith({
        data: { name: "Burger Joint", slug: "bj" },
      })
    })

    it("appends -2 when the base slug is already taken", async () => {
      mockRestaurant.findUnique
        .mockResolvedValueOnce(makeRow()) // "burger-joint" is taken
        .mockResolvedValueOnce(null) //      "burger-joint-2" is free

      await service.create({ name: "Burger Joint" })

      expect(mockRestaurant.create).toHaveBeenCalledWith({
        data: { name: "Burger Joint", slug: "burger-joint-2" },
      })
    })

    it("throws ConflictException(VALIDATION_ERROR) when a slug cannot be derived from the name", async () => {
      // slugify("!!!") === "" — no alphanumeric characters to work with
      const err = await service.create({ name: "!!!" }).catch((e: unknown) => e)

      expect(err).toBeInstanceOf(ConflictException)
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it("throws ConflictException(SLUG_TAKEN) on a P2002 unique-constraint race", async () => {
      mockRestaurant.create.mockRejectedValue({ code: "P2002" })

      const err = await service
        .create({ name: "Burger Joint" })
        .catch((e: unknown) => e)

      expect(err).toBeInstanceOf(ConflictException)
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.SLUG_TAKEN,
      })
    })

    it("rethrows unexpected errors from the database", async () => {
      const boom = new Error("unexpected DB failure")
      mockRestaurant.create.mockRejectedValue(boom)

      await expect(service.create({ name: "Burger Joint" })).rejects.toBe(boom)
    })
  })

  describe("findAll", () => {
    it("returns a paginated envelope ordered by createdAt descending", async () => {
      const rows = [makeRow({ id: "a" }), makeRow({ id: "b" })]
      mockRestaurant.findMany.mockResolvedValue(rows)
      mockRestaurant.count.mockResolvedValue(2)

      const result = await service.findAll(1, 20)

      expect(mockRestaurant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      })
      expect(mockRestaurant.count).toHaveBeenCalled()
      expect(result).toEqual({ items: rows, total: 2, page: 1, pageSize: 20 })
    })

    it("computes skip from page and pageSize", async () => {
      await service.findAll(3, 10)

      expect(mockRestaurant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
      })
    })
  })

  describe("findBySlug", () => {
    it("returns the restaurant when found", async () => {
      const row = makeRow()
      mockRestaurant.findUnique.mockResolvedValue(row)

      const result = await service.findBySlug("burger-joint")

      expect(result).toBe(row)
    })

    it("throws NotFoundException(RESTAURANT_NOT_FOUND) when no record matches", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service
        .findBySlug("nonexistent")
        .catch((e: unknown) => e)

      expect(err).toBeInstanceOf(NotFoundException)
      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })
  })
})
