import { ConflictException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { TagsService } from "./tags.service"

const responseOf = (err: unknown) =>
  (err as ConflictException | NotFoundException).getResponse()

describe("TagsService", () => {
  let service: TagsService
  let prismaMock: {
    restaurant: { findUnique: jest.Mock }
    tag: {
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
      tag: {
        findUnique: jest.fn().mockResolvedValue({ id: "t1", label: "vegan" }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "t1", label: "vegan" }),
        update: jest.fn().mockResolvedValue({ id: "t1", label: "vegan" }),
        delete: jest.fn().mockResolvedValue({ id: "t1" }),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(TagsService)
  })

  describe("create", () => {
    it("creates a tag with an optional color", async () => {
      await service.create("r1", { label: "vegan", color: "#22c55e" })
      expect(prismaMock.tag.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", label: "vegan", color: "#22c55e" },
      })
    })

    it("defaults color to null when omitted", async () => {
      await service.create("r1", { label: "acılı" })
      expect(prismaMock.tag.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", label: "acılı", color: null },
      })
    })

    it("throws TAG_LABEL_TAKEN on a P2002 collision", async () => {
      prismaMock.tag.create.mockRejectedValue({ code: "P2002" })
      const err = await service.create("r1", { label: "vegan" }).catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.TAG_LABEL_TAKEN })
    })
  })

  describe("remove", () => {
    it("deletes a tag (Prisma detaches its item assignments)", async () => {
      await service.remove("t1")
      expect(prismaMock.tag.delete).toHaveBeenCalledWith({
        where: { id: "t1" },
      })
    })

    it("throws TAG_NOT_FOUND when missing", async () => {
      prismaMock.tag.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.TAG_NOT_FOUND })
    })
  })
})
