import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { S3Service } from "../storage/s3.service"
import { MediaService } from "./media.service"

const responseOf = (err: unknown) =>
  (
    err as BadRequestException | ConflictException | NotFoundException
  ).getResponse()

describe("MediaService", () => {
  let service: MediaService
  let prismaMock: {
    menuItem: { findUnique: jest.Mock }
    mediaAsset: {
      count: jest.Mock
      create: jest.Mock
      findUnique: jest.Mock
      findMany: jest.Mock
      delete: jest.Mock
      update: jest.Mock
    }
    $transaction: jest.Mock
  }
  let s3Mock: {
    presignPut: jest.Mock
    head: jest.Mock
    delete: jest.Mock
    publicUrl: jest.Mock
  }

  beforeEach(async () => {
    prismaMock = {
      menuItem: { findUnique: jest.fn().mockResolvedValue({ id: "i1" }) },
      mediaAsset: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "m1", ...data })
          ),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "m1", storageKey: "items/i1/abc" }),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({ id: "m1" }),
        update: jest.fn().mockResolvedValue({ id: "m1" }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    }
    s3Mock = {
      presignPut: jest.fn().mockResolvedValue("https://signed.example/put"),
      head: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn((key: string) => `http://media/${key}`),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: S3Service, useValue: s3Mock },
      ],
    }).compile()

    service = module.get(MediaService)
  })

  describe("requestUpload", () => {
    it("mints a presigned grant for a valid photo", async () => {
      const grant = await service.requestUpload("i1", {
        type: "PHOTO",
        mimeType: "image/png",
        sizeBytes: 1_000_000,
      })
      expect(grant.uploadUrl).toBe("https://signed.example/put")
      expect(grant.storageKey).toMatch(/^items\/i1\//)
      expect(s3Mock.presignPut).toHaveBeenCalled()
    })

    it("refuses when the per-item cap is reached (MEDIA_LIMIT_REACHED)", async () => {
      prismaMock.mediaAsset.count.mockResolvedValue(5)
      const err = await service
        .requestUpload("i1", {
          type: "PHOTO",
          mimeType: "image/png",
          sizeBytes: 1000,
        })
        .catch((e) => e)
      expect(err).toBeInstanceOf(ConflictException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MEDIA_LIMIT_REACHED,
      })
      expect(s3Mock.presignPut).not.toHaveBeenCalled()
    })

    it("refuses a disallowed type (MEDIA_TYPE_NOT_ALLOWED)", async () => {
      const err = await service
        .requestUpload("i1", {
          type: "PHOTO",
          mimeType: "text/plain",
          sizeBytes: 1000,
        })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MEDIA_TYPE_NOT_ALLOWED,
      })
    })

    it("refuses an oversize file (MEDIA_TOO_LARGE)", async () => {
      const err = await service
        .requestUpload("i1", {
          type: "PHOTO",
          mimeType: "image/png",
          sizeBytes: 9 * 1024 * 1024,
        })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.MEDIA_TOO_LARGE })
    })
  })

  describe("confirm", () => {
    it("HEAD-verifies then creates the media row with composed URL", async () => {
      s3Mock.head.mockResolvedValue({
        contentLength: 2_000_000,
        contentType: "image/png",
      })
      const asset = await service.confirm("i1", {
        storageKey: "items/i1/abc",
        type: "PHOTO",
      })
      expect(s3Mock.head).toHaveBeenCalledWith("items/i1/abc")
      expect(prismaMock.mediaAsset.create).toHaveBeenCalled()
      expect(asset).toMatchObject({
        type: "PHOTO",
        url: "http://media/items/i1/abc",
      })
    })

    it("never creates a row when the object is missing (no orphan)", async () => {
      s3Mock.head.mockResolvedValue(null)
      const err = await service
        .confirm("i1", { storageKey: "items/i1/ghost", type: "PHOTO" })
        .catch((e) => e)
      expect(err).toBeInstanceOf(NotFoundException)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MEDIA_OBJECT_NOT_FOUND,
      })
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled()
    })

    it("rejects a confirmed object whose real size exceeds the limit", async () => {
      s3Mock.head.mockResolvedValue({
        contentLength: 60 * 1024 * 1024,
        contentType: "video/mp4",
      })
      const err = await service
        .confirm("i1", { storageKey: "items/i1/big", type: "VIDEO" })
        .catch((e) => e)
      expect(responseOf(err)).toMatchObject({ code: ErrorCode.MEDIA_TOO_LARGE })
      expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled()
    })
  })

  describe("remove", () => {
    it("deletes the row then best-effort deletes the object", async () => {
      await service.remove("m1")
      expect(prismaMock.mediaAsset.delete).toHaveBeenCalledWith({
        where: { id: "m1" },
      })
      expect(s3Mock.delete).toHaveBeenCalledWith("items/i1/abc")
    })

    it("throws MEDIA_OBJECT_NOT_FOUND when the media row is missing", async () => {
      prismaMock.mediaAsset.findUnique.mockResolvedValue(null)
      const err = await service.remove("nope").catch((e) => e)
      expect(responseOf(err)).toMatchObject({
        code: ErrorCode.MEDIA_OBJECT_NOT_FOUND,
      })
    })
  })
})
