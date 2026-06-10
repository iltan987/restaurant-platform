import { randomUUID } from "node:crypto"

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import {
  isAllowedMime,
  isWithinSize,
  MEDIA_MAX_PER_ITEM,
  type MediaKind,
} from "@repo/core"
import {
  type ConfirmMediaInput,
  ErrorCode,
  type RequestUploadInput,
} from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"
import { S3Service } from "../storage/s3.service"

const UPLOAD_EXPIRY_SEC = 300

type MediaRow = {
  id: string
  itemId: string
  type: string
  storageKey: string
  mimeType: string
  position: number
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  /** Mints a presigned PUT after checking the per-item cap + type/size (FR-023). */
  async requestUpload(itemId: string, input: RequestUploadInput) {
    await this.getItemOrThrow(itemId)
    await this.assertUnderCap(itemId)
    this.assertTypeAndSize(input.type, input.mimeType, input.sizeBytes)

    const storageKey = `items/${itemId}/${randomUUID()}`
    const uploadUrl = await this.s3.presignPut(
      storageKey,
      input.mimeType,
      UPLOAD_EXPIRY_SEC
    )
    return { uploadUrl, storageKey, expiresInSec: UPLOAD_EXPIRY_SEC }
  }

  /**
   * Confirms an upload: HEAD-verifies the object exists and re-checks its real
   * type/size before creating the row, so a cancelled/failed upload never
   * becomes visible media (FR-024).
   */
  async confirm(itemId: string, input: ConfirmMediaInput) {
    await this.getItemOrThrow(itemId)
    await this.assertUnderCap(itemId)

    const head = await this.s3.head(input.storageKey)
    if (!head) {
      throw new NotFoundException({
        code: ErrorCode.MEDIA_OBJECT_NOT_FOUND,
        message: "Uploaded object was not found",
      })
    }
    this.assertTypeAndSize(input.type, head.contentType, head.contentLength)

    const position = await this.prisma.mediaAsset.count({ where: { itemId } })
    const asset = await this.prisma.mediaAsset.create({
      data: {
        itemId,
        type: input.type,
        storageKey: input.storageKey,
        mimeType: head.contentType,
        sizeBytes: head.contentLength,
        position,
      },
    })
    return this.toResponse(asset)
  }

  /** Removes the row, then best-effort deletes the object. */
  async remove(mediaId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaId },
    })
    if (!asset) {
      throw new NotFoundException({
        code: ErrorCode.MEDIA_OBJECT_NOT_FOUND,
        message: `Media with id "${mediaId}" was not found`,
      })
    }
    await this.prisma.mediaAsset.delete({ where: { id: mediaId } })
    await this.s3.delete(asset.storageKey).catch(() => undefined)
  }

  async reorder(itemId: string, ids: string[]) {
    await this.getItemOrThrow(itemId)
    const owned = await this.prisma.mediaAsset.findMany({
      where: { id: { in: ids }, itemId },
      select: { id: true },
    })
    const known = new Set(owned.map((m) => m.id))
    const stray = ids.find((id) => !known.has(id))
    if (stray) {
      throw new NotFoundException({
        code: ErrorCode.MEDIA_OBJECT_NOT_FOUND,
        message: `Media with id "${stray}" was not found`,
      })
    }
    await this.prisma.$transaction((tx) =>
      Promise.all(
        ids.map((id, index) =>
          tx.mediaAsset.update({ where: { id }, data: { position: index } })
        )
      )
    )
    const assets = await this.prisma.mediaAsset.findMany({
      where: { itemId },
      orderBy: { position: "asc" },
    })
    return assets.map((a) => this.toResponse(a))
  }

  private async assertUnderCap(itemId: string) {
    const count = await this.prisma.mediaAsset.count({ where: { itemId } })
    if (count >= MEDIA_MAX_PER_ITEM) {
      throw new ConflictException({
        code: ErrorCode.MEDIA_LIMIT_REACHED,
        message: `An item can have at most ${MEDIA_MAX_PER_ITEM} media`,
      })
    }
  }

  private assertTypeAndSize(type: string, mimeType: string, sizeBytes: number) {
    if (!isAllowedMime(type as MediaKind, mimeType)) {
      throw new BadRequestException({
        code: ErrorCode.MEDIA_TYPE_NOT_ALLOWED,
        message: `Media type "${mimeType}" is not allowed`,
      })
    }
    if (!isWithinSize(type as MediaKind, sizeBytes)) {
      throw new BadRequestException({
        code: ErrorCode.MEDIA_TOO_LARGE,
        message: "Media exceeds the maximum allowed size",
      })
    }
  }

  private toResponse(asset: MediaRow) {
    return {
      id: asset.id,
      itemId: asset.itemId,
      type: asset.type,
      url: this.s3.publicUrl(asset.storageKey),
      mimeType: asset.mimeType,
      position: asset.position,
    }
  }

  private async getItemOrThrow(itemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
    })
    if (!item) {
      throw new NotFoundException({
        code: ErrorCode.MENU_ITEM_NOT_FOUND,
        message: `Menu item with id "${itemId}" was not found`,
      })
    }
    return item
  }
}
