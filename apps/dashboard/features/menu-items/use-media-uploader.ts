"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { isAllowedMime, isWithinSize, type MediaKind } from "@repo/core"
import { getErrorMessage } from "@repo/i18n"
import { ErrorCode } from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import {
  confirmMedia,
  deleteMedia,
  putToStorage,
  reorderMedia,
  requestUpload,
} from "./media-api"

function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "PHOTO"
  if (file.type.startsWith("video/")) return "VIDEO"
  return null
}

/**
 * Orchestrates the 3-step direct upload (grant → PUT → confirm) with a
 * client-side pre-check that mirrors the server limits, plus delete and
 * make-cover (reorder). All paths refresh the item detail.
 */
export function useMediaUploader(categoryId: string, itemId: string) {
  const queryClient = useQueryClient()
  const [isUploading, setUploading] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["menu-item", itemId] })
    queryClient.invalidateQueries({ queryKey: ["menu-items", categoryId] })
  }

  async function upload(file: File) {
    const kind = kindOf(file)
    if (!kind || !isAllowedMime(kind, file.type)) {
      toast.error(getErrorMessage(ErrorCode.MEDIA_TYPE_NOT_ALLOWED))
      return
    }
    if (!isWithinSize(kind, file.size)) {
      toast.error(getErrorMessage(ErrorCode.MEDIA_TOO_LARGE))
      return
    }

    setUploading(true)
    try {
      const grant = await requestUpload(itemId, {
        type: kind,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      await putToStorage(grant.uploadUrl, file)
      await confirmMedia(itemId, { storageKey: grant.storageKey, type: kind })
      invalidate()
    } catch (err) {
      toastApiError(err)
    } finally {
      setUploading(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteMedia(id)
      invalidate()
    } catch (err) {
      toastApiError(err)
    }
  }

  /** Moves `id` to the front (cover) of the current ordered list. */
  async function makeCover(id: string, orderedIds: string[]) {
    try {
      await reorderMedia(itemId, [id, ...orderedIds.filter((x) => x !== id)])
      invalidate()
    } catch (err) {
      toastApiError(err)
    }
  }

  return { upload, remove, makeCover, isUploading }
}
