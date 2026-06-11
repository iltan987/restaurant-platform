import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { AllergensService } from "./allergens.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("AllergensService", () => {
  let service: AllergensService
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    allergen: {
      findUnique: jest.Mock
      findMany: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
  }

  beforeEach(async () => {
    prismaMock = {
      restaurant: { findUnique: jest.fn().mockResolvedValue({ id: "r1" }) },
      allergen: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "a1", label: "Domates", isStandard: false }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "a1", label: "Domates" }),
        update: jest.fn().mockResolvedValue({ id: "a1", label: "Domates" }),
        delete: jest.fn().mockResolvedValue({ id: "a1" }),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergensService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(AllergensService)
  })

  describe("create", () => {
    it("creates a custom (non-standard) allergen", async () => {
      await service.create("r1", { label: "Domates" })
      expect(prismaMock.allergen.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", label: "Domates", isStandard: false },
      })
    })

    it("throws ALLERGEN_LABEL_TAKEN on a P2002 collision", async () => {
      prismaMock.allergen.create.mockRejectedValue({ code: "P2002" })
      const err = await service.create("r1", { label: "Süt" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.ALLERGEN_LABEL_TAKEN,
      })
    })

    it("throws RESTAURANT_NOT_FOUND when the restaurant is missing", async () => {
      prismaMock.restaurant.findUnique.mockResolvedValue(null)
      const err = await service.create("nope", { label: "X" }).catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })
  })

  describe("remove", () => {
    it("protects the standard set (ALLERGEN_STANDARD_PROTECTED)", async () => {
      prismaMock.allergen.findUnique.mockResolvedValue({
        id: "std",
        label: "Süt",
        isStandard: true,
      })
      const err = await service.remove("std").catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.ALLERGEN_STANDARD_PROTECTED,
      })
      expect(prismaMock.allergen.delete).not.toHaveBeenCalled()
    })

    it("deletes a custom allergen (Prisma detaches its item assignments)", async () => {
      await service.remove("a1")
      expect(prismaMock.allergen.delete).toHaveBeenCalledWith({
        where: { id: "a1" },
      })
    })

    it("throws ALLERGEN_NOT_FOUND when missing", async () => {
      prismaMock.allergen.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.ALLERGEN_NOT_FOUND,
      })
    })
  })
})
