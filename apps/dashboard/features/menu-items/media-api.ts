import { apiFetch, apiSend } from "@repo/api-client"
import {
  type ConfirmMediaInput,
  type MediaAsset,
  mediaAssetSchema,
  type RequestUploadInput,
  type UploadGrant,
  uploadGrantSchema,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const mediaListSchema = mediaAssetSchema.array()

/** Step 1: ask the API for a presigned PUT (it checks the limits). */
export function requestUpload(
  itemId: string,
  input: RequestUploadInput
): Promise<UploadGrant> {
  return apiFetch(
    `${API}/menu-items/${itemId}/media/upload-url`,
    uploadGrantSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

/** Step 2: PUT the bytes straight to object storage (not our API). */
export async function putToStorage(
  uploadUrl: string,
  file: File
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
}

/** Step 3: confirm — the API HEAD-verifies and creates the media row. */
export function confirmMedia(
  itemId: string,
  input: ConfirmMediaInput
): Promise<MediaAsset> {
  return apiFetch(`${API}/menu-items/${itemId}/media`, mediaAssetSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteMedia(id: string): Promise<void> {
  return apiSend(`${API}/media/${id}`, { method: "DELETE" })
}

export function reorderMedia(
  itemId: string,
  ids: string[]
): Promise<MediaAsset[]> {
  return apiFetch(`${API}/menu-items/${itemId}/media/order`, mediaListSchema, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
}
