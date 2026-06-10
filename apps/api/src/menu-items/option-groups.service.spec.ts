import { BadRequestException, NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { OptionGroupsService } from "./option-groups.service"

const responseOf = (err: unknown) =>
  (err as BadRequestException | NotFoundException).getResponse()

describe("OptionGroupsService", () => {
  let service: OptionGroupsService
  let prismaMock: {
    menuItem: { findUnique: jest.Mock }
    optionGroup: {
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      create: jest.Mock
      update: jest.Mock
      delete: jest.Mock
    }
    option: {
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
      menuItem: { findUnique: jest.fn().mockResolvedValue({ id: "i1" }) },
      optionGroup: {
        findUnique: jest.fn().mockResolvedValue({
          id: "g1",
          itemId: "i1",
          minSelect: 1,
          maxSelect: 1,
          required: true,
        }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "g1" }),
        update: jest.fn().mockResolvedValue({ id: "g1" }),
        delete: jest.fn().mockResolvedValue({ id: "g1" }),
      },
      option: {
        findUnique: jest.fn().mockResolvedValue({ id: "o1", groupId: "g1" }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "o1" }),
        update: jest.fn().mockResolvedValue({ id: "o1" }),
        delete: jest.fn().mockResolvedValue({ id: "o1" }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionGroupsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile()

    service = module.get(OptionGroupsService)
  })

  describe("createGroup", () => {
    it("creates a valid required single-select group at the end", async () => {
      prismaMock.optionGroup.count.mockResolvedValue(2)
      await service.createGroup("i1", {
        name: "Boy",
        minSelect: 1,
        maxSelect: 1,
        required: true,
      })
      expect(prismaMock.optionGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            itemId: "i1",
            name: "Boy",
            position: 2,
            minSelect: 1,
            maxSelect: 1,
            required: true,
          },
        })
      )
    })

    it("rejects an inconsistent rule with INVALID_OPTION_CONFIG", async () => {
      const err = await service
        .createGroup("i1", {
          name: "Bad",
          minSelect: 3,
          maxSelect: 2,
          required: false,
        })
        .catch((e) => e)
      expect(err).toBeInstanceOf(BadRequestException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.INVALID_OPTION_CONFIG,
      })
      expect(prismaMock.optionGroup.create).not.toHaveBeenCalled()
    })

    it("rejects required with minSelect 0", async () => {
      const err = await service
        .createGroup("i1", {
          name: "Bad",
          minSelect: 0,
          maxSelect: null,
          required: true,
        })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.INVALID_OPTION_CONFIG,
      })
    })

    it("throws MENU_ITEM_NOT_FOUND when the item is missing", async () => {
      prismaMock.menuItem.findUnique.mockResolvedValue(null)
      const err = await service
        .createGroup("nope", {
          name: "X",
          minSelect: 0,
          maxSelect: null,
          required: false,
        })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
      })
    })
  })

  describe("updateGroup", () => {
    it("rejects an update that makes the rule inconsistent", async () => {
      // existing: min 1 / max 1 / required; set maxSelect 0 → invalid
      const err = await service
        .updateGroup("g1", { maxSelect: null, required: true, minSelect: 0 })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.INVALID_OPTION_CONFIG,
      })
    })

    it("throws OPTION_GROUP_NOT_FOUND when missing", async () => {
      prismaMock.optionGroup.findUnique.mockResolvedValue(null)
      const err = await service
        .updateGroup("nope", { name: "X" })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.OPTION_GROUP_NOT_FOUND,
      })
    })
  })

  describe("options", () => {
    it("creates an option at the end of its group", async () => {
      prismaMock.option.count.mockResolvedValue(1)
      await service.createOption("g1", {
        name: "Mantar",
        priceDeltaMinor: 1500,
        defaultSelected: false,
        isAvailable: true,
      })
      expect(prismaMock.option.create).toHaveBeenCalledWith({
        data: {
          groupId: "g1",
          name: "Mantar",
          priceDeltaMinor: 1500,
          defaultSelected: false,
          isAvailable: true,
          position: 1,
        },
      })
    })

    it("throws OPTION_NOT_FOUND updating a missing option", async () => {
      prismaMock.option.findUnique.mockResolvedValue(null)
      const err = await service
        .updateOption("nope", { isAvailable: false })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.OPTION_NOT_FOUND,
      })
    })

    it("rejects reordering with an option not in the group", async () => {
      prismaMock.option.findMany.mockResolvedValueOnce([{ id: "o1" }])
      const err = await service
        .reorderOptions("g1", ["o1", "ghost"])
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.OPTION_NOT_FOUND,
      })
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })
  })
})
