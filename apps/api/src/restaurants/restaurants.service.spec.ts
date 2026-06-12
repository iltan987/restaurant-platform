import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { ActivityService } from "../activity/activity.service"
import { PrismaService } from "../prisma/prisma.service"
import { RestaurantsService } from "./restaurants.service"

const makeRow = (
  overrides: Partial<{
    id: string
    name: string
    slug: string
    status: "ACTIVE" | "INACTIVE"
    onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
    plan: "FREE" | "PRO" | "ENTERPRISE"
    createdAt: Date
    updatedAt: Date
  }> = {}
) => ({
  id: "cuid-1",
  name: "Burger Joint",
  slug: "burger-joint",
  status: "INACTIVE" as const,
  onboardingStatus: "IN_PROGRESS" as const,
  language: "tr",
  currency: "TRY",
  plan: "FREE" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

/**
 * A row shaped like Prisma's `findMany({ include: COUNTS_INCLUDE })` result:
 * a `_count` for the direct relations plus nested floors→areas carrying table
 * counts. Expected flattened counts: floorCount 2, areaCount 2, tableCount 7,
 * categoryCount 3, menuItemCount 4.
 */
const makeCountRow = (overrides: Parameters<typeof makeRow>[0] = {}) => ({
  ...makeRow(overrides),
  _count: { floors: 2, categories: 3, menuItems: 4 },
  floors: [
    { areas: [{ _count: { tables: 5 } }, { _count: { tables: 2 } }] },
    { areas: [] },
  ],
})

describe("RestaurantsService", () => {
  let service: RestaurantsService
  let mockRestaurant: {
    create: jest.Mock
    findMany: jest.Mock
    findUnique: jest.Mock
    count: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  let mockFloor: { create: jest.Mock }
  let mockArea: { create: jest.Mock }
  let mockTable: { count: jest.Mock }
  let mockAllergen: { createMany: jest.Mock }
  let mockActivity: { record: jest.Mock }
  let prismaMock: {
    restaurant: typeof mockRestaurant
    floor: typeof mockFloor
    area: typeof mockArea
    table: typeof mockTable
    allergen: typeof mockAllergen
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    mockRestaurant = {
      create: jest.fn().mockResolvedValue(makeRow()),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest
        .fn()
        .mockImplementation(({ data }) => Promise.resolve(makeRow(data))),
      delete: jest.fn().mockResolvedValue(makeRow()),
    }
    mockFloor = { create: jest.fn().mockResolvedValue({ id: "floor-1" }) }
    mockArea = { create: jest.fn().mockResolvedValue({ id: "area-1" }) }
    mockTable = { count: jest.fn().mockResolvedValue(0) }
    mockAllergen = { createMany: jest.fn().mockResolvedValue({ count: 14 }) }
    mockActivity = { record: jest.fn().mockResolvedValue(undefined) }
    prismaMock = {
      restaurant: mockRestaurant,
      floor: mockFloor,
      area: mockArea,
      table: mockTable,
      allergen: mockAllergen,
      // Interactive transaction — invoke the callback with the same delegates.
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({
          restaurant: mockRestaurant,
          floor: mockFloor,
          area: mockArea,
          allergen: mockAllergen,
        })
      ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ActivityService, useValue: mockActivity },
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

    it("seeds the standard allergen set on create (SC-007)", async () => {
      const row = makeRow()
      mockRestaurant.create.mockResolvedValue(row)

      await service.create({ name: "Burger Joint" })

      expect(mockAllergen.createMany).toHaveBeenCalledTimes(1)
      const arg = mockAllergen.createMany.mock.calls[0][0] as {
        data: { restaurantId: string; label: string; isStandard: boolean }[]
      }
      expect(arg.data).toHaveLength(14)
      expect(
        arg.data.every((a) => a.restaurantId === row.id && a.isStandard)
      ).toBe(true)
      expect(arg.data.map((a) => a.label)).toContain("Süt")
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
    it("returns a paginated envelope ordered by createdAt descending, with flattened counts", async () => {
      const rows = [makeCountRow({ id: "a" }), makeCountRow({ id: "b" })]
      mockRestaurant.findMany.mockResolvedValue(rows)
      mockRestaurant.count.mockResolvedValue(2)

      const result = await service.findAll(1, 20)

      expect(mockRestaurant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      })
      expect(mockRestaurant.count).toHaveBeenCalled()
      expect(result).toMatchObject({ total: 2, page: 1, pageSize: 20 })
      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({
        id: "a",
        floorCount: 2,
        areaCount: 2,
        tableCount: 7,
        categoryCount: 3,
        menuItemCount: 4,
      })
      // the nested Prisma payload is flattened away
      expect(result.items[0]).not.toHaveProperty("_count")
      expect(result.items[0]).not.toHaveProperty("floors")
    })

    it("computes skip from page and pageSize", async () => {
      await service.findAll(3, 10)

      expect(mockRestaurant.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        skip: 20,
        take: 10,
        include: expect.any(Object),
      })
    })
  })

  describe("findBySlug", () => {
    it("returns the restaurant with flattened counts when found", async () => {
      const row = makeCountRow({ id: "cuid-1" })
      mockRestaurant.findUnique.mockResolvedValue(row)

      const result = await service.findBySlug("burger-joint")

      expect(mockRestaurant.findUnique).toHaveBeenCalledWith({
        where: { slug: "burger-joint" },
        include: expect.any(Object),
      })
      expect(result).toMatchObject({
        id: "cuid-1",
        floorCount: 2,
        areaCount: 2,
        tableCount: 7,
        categoryCount: 3,
        menuItemCount: 4,
      })
      expect(result).not.toHaveProperty("_count")
      expect(result).not.toHaveProperty("floors")
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

  describe("isSlugAvailable", () => {
    it("reports an unused, valid slug as available", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const result = await service.isSlugAvailable("Yeni Restoran")

      expect(result).toEqual({
        slug: "Yeni Restoran",
        normalized: "yeni-restoran",
        available: true,
      })
      expect(mockRestaurant.findUnique).toHaveBeenCalledWith({
        where: { slug: "yeni-restoran" },
        select: { id: true },
      })
    })

    it("reports a taken slug as unavailable", async () => {
      mockRestaurant.findUnique.mockResolvedValue({ id: "cuid-1" })

      const result = await service.isSlugAvailable("burger-joint")

      expect(result.available).toBe(false)
      expect(result.normalized).toBe("burger-joint")
    })

    it("rejects reserved slugs without hitting the database", async () => {
      const result = await service.isSlugAvailable("admin")

      expect(result.available).toBe(false)
      expect(mockRestaurant.findUnique).not.toHaveBeenCalled()
    })

    it("rejects input that normalizes to an empty slug", async () => {
      const result = await service.isSlugAvailable("!!!")

      expect(result).toEqual({ slug: "!!!", normalized: "", available: false })
      expect(mockRestaurant.findUnique).not.toHaveBeenCalled()
    })
  })

  describe("setStatus", () => {
    it("rejects going live with zero tables (GO_LIVE_REQUIRES_TABLE)", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())
      mockTable.count.mockResolvedValue(0)

      const err = await service
        .setStatus("cuid-1", { status: "ACTIVE" })
        .catch((e: unknown) => e)

      expect(err).toBeInstanceOf(ConflictException)
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.GO_LIVE_REQUIRES_TABLE,
      })
      expect(mockRestaurant.update).not.toHaveBeenCalled()
    })

    it("activates a restaurant that has at least one table", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())
      mockTable.count.mockResolvedValue(1)

      const result = await service.setStatus("cuid-1", { status: "ACTIVE" })

      expect(mockTable.count).toHaveBeenCalledWith({
        where: { area: { floor: { restaurantId: "cuid-1" } } },
      })
      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { status: "ACTIVE" },
      })
      expect(result.status).toBe("ACTIVE")
    })

    it("deactivates without checking tables", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow({ status: "ACTIVE" }))

      await service.setStatus("cuid-1", { status: "INACTIVE" })

      expect(mockTable.count).not.toHaveBeenCalled()
      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { status: "INACTIVE" },
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown id", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service
        .setStatus("nope", { status: "INACTIVE" })
        .catch((e: unknown) => e)

      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })
  })

  describe("update", () => {
    it("updates the name and re-slugs the slug", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      await service.update("cuid-1", { name: "New Name", slug: "Yeni Slug" })

      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { name: "New Name", slug: "yeni-slug" },
      })
    })

    it("updates the locale preferences (language / currency)", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      await service.update("cuid-1", { language: "tr", currency: "TRY" })

      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { language: "tr", currency: "TRY" },
      })
    })

    it("throws SLUG_TAKEN on a P2002 unique-constraint violation", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())
      mockRestaurant.update.mockRejectedValue({ code: "P2002" })

      const err = await service
        .update("cuid-1", { slug: "taken" })
        .catch((e: unknown) => e)

      expect(err).toBeInstanceOf(ConflictException)
      expect((err as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.SLUG_TAKEN,
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown id", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service
        .update("nope", { name: "x" })
        .catch((e: unknown) => e)

      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
      expect(mockRestaurant.update).not.toHaveBeenCalled()
    })
  })

  describe("remove", () => {
    it("deletes an existing restaurant (cascade handled by the DB)", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      await service.remove("cuid-1")

      expect(mockRestaurant.delete).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown id", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service.remove("nope").catch((e: unknown) => e)

      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
      expect(mockRestaurant.delete).not.toHaveBeenCalled()
    })
  })

  describe("setPlan", () => {
    it("updates the billing tier", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      const result = await service.setPlan("cuid-1", { plan: "PRO" })

      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { plan: "PRO" },
      })
      expect(result.plan).toBe("PRO")
      expect(mockActivity.record).toHaveBeenCalledWith({
        type: "PLAN_CHANGED",
        restaurantId: "cuid-1",
        meta: { from: "FREE", to: "PRO" },
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown id", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service
        .setPlan("nope", { plan: "PRO" })
        .catch((e: unknown) => e)

      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
      expect(mockRestaurant.update).not.toHaveBeenCalled()
    })
  })

  describe("setOnboarding", () => {
    it("sets onboarding terminal state without activating", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      await service.setOnboarding("cuid-1", { onboardingStatus: "COMPLETED" })

      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { onboardingStatus: "COMPLETED" },
      })
      // status is never touched here
      expect(mockRestaurant.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expect.anything() }),
        })
      )
    })

    it("supports skipping", async () => {
      mockRestaurant.findUnique.mockResolvedValue(makeRow())

      await service.setOnboarding("cuid-1", { onboardingStatus: "SKIPPED" })

      expect(mockRestaurant.update).toHaveBeenCalledWith({
        where: { id: "cuid-1" },
        data: { onboardingStatus: "SKIPPED" },
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown id", async () => {
      mockRestaurant.findUnique.mockResolvedValue(null)

      const err = await service
        .setOnboarding("nope", { onboardingStatus: "COMPLETED" })
        .catch((e: unknown) => e)

      expect((err as NotFoundException).getResponse()).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })
  })
})
