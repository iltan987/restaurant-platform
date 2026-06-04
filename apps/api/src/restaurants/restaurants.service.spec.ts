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
    createdAt: Date
    updatedAt: Date
  }> = {}
) => ({
  id: "cuid-1",
  name: "Burger Joint",
  slug: "burger-joint",
  status: "ACTIVE" as const,
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
  }

  beforeEach(async () => {
    mockRestaurant = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        {
          provide: PrismaService,
          useValue: { restaurant: mockRestaurant },
        },
      ],
    }).compile()

    service = module.get<RestaurantsService>(RestaurantsService)
  })

  describe("create", () => {
    it("derives the slug from name when no slug is provided", async () => {
      const row = makeRow({ name: "Burger Joint", slug: "burger-joint" })
      mockRestaurant.findUnique.mockResolvedValue(null)
      mockRestaurant.create.mockResolvedValue(row)

      const result = await service.create({ name: "Burger Joint" })

      expect(mockRestaurant.create).toHaveBeenCalledWith({
        data: { name: "Burger Joint", slug: "burger-joint" },
      })
      expect(result).toBe(row)
    })

    it("uses the provided slug instead of deriving one from the name", async () => {
      const row = makeRow({ slug: "bj" })
      mockRestaurant.findUnique.mockResolvedValue(null)
      mockRestaurant.create.mockResolvedValue(row)

      await service.create({ name: "Burger Joint", slug: "bj" })

      expect(mockRestaurant.create).toHaveBeenCalledWith({
        data: { name: "Burger Joint", slug: "bj" },
      })
    })

    it("appends -2 when the base slug is already taken", async () => {
      const newRow = makeRow({ slug: "burger-joint-2" })
      mockRestaurant.findUnique
        .mockResolvedValueOnce(makeRow()) // "burger-joint" is taken
        .mockResolvedValueOnce(null) //      "burger-joint-2" is free
      mockRestaurant.create.mockResolvedValue(newRow)

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
    })

    it("throws ConflictException(SLUG_TAKEN) on a P2002 unique-constraint race", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)
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
      mockRestaurant.findUnique.mockResolvedValue(null)
      const boom = new Error("unexpected DB failure")
      mockRestaurant.create.mockRejectedValue(boom)

      await expect(service.create({ name: "Burger Joint" })).rejects.toBe(boom)
    })
  })

  describe("findAll", () => {
    it("delegates to Prisma ordered by createdAt descending", async () => {
      const rows = [makeRow({ id: "a" }), makeRow({ id: "b" })]
      mockRestaurant.findMany.mockResolvedValue(rows)

      const result = await service.findAll()

      expect(mockRestaurant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      })
      expect(result).toBe(rows)
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
