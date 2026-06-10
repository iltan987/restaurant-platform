import { z } from "zod"

export const mediaTypeSchema = z.enum(["PHOTO", "VIDEO"])
export type MediaType = z.infer<typeof mediaTypeSchema>

// ── Direct upload flow ──
// 1) request a presigned PUT (limits checked at grant time)
// 2) browser PUTs the bytes straight to storage
// 3) confirm — the API HEAD-verifies the object before creating the row, so no
//    dangling/partial media ever appears (FR-024).

export const requestUploadSchema = z.object({
  type: mediaTypeSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

export type RequestUploadInput = z.infer<typeof requestUploadSchema>

export const uploadGrantSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
  expiresInSec: z.number().int(),
})

export type UploadGrant = z.infer<typeof uploadGrantSchema>

export const confirmMediaSchema = z.object({
  storageKey: z.string().min(1),
  type: mediaTypeSchema,
})

export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>

// ── API response schema ──
// The API always composes the public `url` from the stored object key.

export const mediaAssetSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  type: mediaTypeSchema,
  url: z.string(),
  mimeType: z.string(),
  position: z.number().int(),
})

export type MediaAsset = z.infer<typeof mediaAssetSchema>
