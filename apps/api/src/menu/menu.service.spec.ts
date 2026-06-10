import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { S3Service } from "../storage/s3.service"
import { MenuService } from "./menu.service"

const responseOf = (err: unknown) => (err as NotFoundException).getResponse()

// A Monday 12:00 in Europe/Istanbul (UTC+3) → 09:00Z. Used to make the
// orderableNow window math deterministic regardless of when the suite runs.
const MONDAY_NOON_IST = new Date("2026-06-08T09:00:00Z")

const baseItem = {
  id: "i1",
  itemId: "i1",
  inStock: true,
  optionGroups: [],
  allergens: [],
  tags: [],
  availabilityWindows: [],
  media: [],
}

function restaurantWith(items: unknown[], overrides = {}) {
  return {
    id: "r1",
    name: "Lezzet",
    slug: "lezzet",
    status: "ACTIVE",
    categories: [{ id: "c1", restaurantId: "r1", name: "Başlangıçlar", items }],
    ...overrides,
  }
}

describe("MenuService", () => {
  let service: MenuService
  let prismaMock: { restaurant: { findUnique: jest.Mock } }

  beforeEach(async () => {
    prismaMock = { restaurant: { findUnique: jest.fn() } }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: S3Service,
          useValue: { publicUrl: (key: string) => `http://media/${key}` },
        },
      ],
    }).compile()

    service = module.get(MenuService)
    jest
      .spyOn(service as unknown as { nowDate: () => Date }, "nowDate")
      .mockReturnValue(MONDAY_NOON_IST)
  })

  describe("active gating", () => {
    it("404s (RESTAURANT_NOT_FOUND) for an unknown slug", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(null)
      const err = await service.getBySlug("ghost").catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })

    it("404s a non-ACTIVE restaurant (no unpublished-menu leak)", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(
        restaurantWith([], { status: "INACTIVE" })
      )
      const err = await service.getBySlug("lezzet").catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })

    it("excludes hidden categories at the query level", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(restaurantWith([]))
      await service.getBySlug("lezzet")
      const arg = prismaMock.restaurant.findUnique.mock.calls[0][0]
      expect(arg.include.categories.where).toEqual({ isHidden: false })
    })
  })

  describe("tree shape", () => {
    it("returns the restaurant subset, categories, and composed media URLs", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(
        restaurantWith([
          {
            ...baseItem,
            media: [
              {
                id: "m1",
                itemId: "i1",
                type: "PHOTO",
                storageKey: "items/i1/a",
                mimeType: "image/png",
                position: 0,
              },
            ],
          },
        ])
      )
      const tree = await service.getBySlug("lezzet")
      expect(tree.restaurant).toEqual({
        id: "r1",
        name: "Lezzet",
        slug: "lezzet",
      })
      expect(tree.categories).toHaveLength(1)
      expect(tree.categories[0]!.items[0]!.media[0]!.url).toBe(
        "http://media/items/i1/a"
      )
    })
  })

  describe("orderableNow per item", () => {
    it("ok when in stock and inside an active window", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(
        restaurantWith([
          {
            ...baseItem,
            availabilityWindows: [
              { days: ["MON"], startMin: 600, endMin: 840 },
            ],
          },
        ])
      )
      const tree = await service.getBySlug("lezzet")
      expect(tree.categories[0]!.items[0]!.orderableNow).toEqual({ ok: true })
    })

    it("OUTSIDE_WINDOW when in stock but outside every window", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(
        restaurantWith([
          {
            ...baseItem,
            availabilityWindows: [{ days: ["MON"], startMin: 0, endMin: 60 }],
          },
        ])
      )
      const tree = await service.getBySlug("lezzet")
      expect(tree.categories[0]!.items[0]!.orderableNow).toEqual({
        ok: false,
        reason: "OUTSIDE_WINDOW",
      })
    })

    it("OUT_OF_STOCK takes precedence over any window", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(
        restaurantWith([{ ...baseItem, inStock: false }])
      )
      const tree = await service.getBySlug("lezzet")
      expect(tree.categories[0]!.items[0]!.orderableNow).toEqual({
        ok: false,
        reason: "OUT_OF_STOCK",
      })
    })
  })
})
