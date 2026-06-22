"use client"

import { useQuery } from "@tanstack/react-query"
import { FilmIcon, ImagePlusIcon, StarIcon, Trash2Icon } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"

import { MEDIA_LIMITS } from "@repo/core"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { menuItemsQueries } from "../queries"
import { useMediaUploader } from "../use-media-uploader"

const ACCEPT = [
  ...MEDIA_LIMITS.PHOTO.mimeTypes,
  ...MEDIA_LIMITS.VIDEO.mimeTypes,
].join(",")

/**
 * Item media gallery + direct uploader (US5). The first item is the cover;
 * "Kapak yap" reorders a photo to the front. Disallowed/oversize files are
 * rejected client-side before an upload URL is requested.
 */
export function MediaUploader({
  itemId,
  categoryId,
}: {
  itemId: string
  categoryId: string
}) {
  const { data: detail } = useQuery(menuItemsQueries.detail(itemId))
  const { upload, remove, makeCover, isUploading } = useMediaUploader(
    categoryId,
    itemId
  )
  const fileInput = useRef<HTMLInputElement>(null)

  const media = detail?.media ?? []
  const orderedIds = media.map((m) => m.id)

  async function onPick(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) await upload(file)
    if (fileInput.current) fileInput.current.value = ""
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Görseller</span>
        {isUploading && <Spinner className="size-4" />}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {media.map((m, i) => (
          <div
            key={m.id}
            className="group relative aspect-square overflow-hidden rounded-card border border-line bg-surface-muted"
          >
            {m.type === "PHOTO" ? (
              <Image
                src={m.url}
                alt=""
                fill
                sizes="(max-width: 768px) 25vw, 160px"
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-ink-3">
                <FilmIcon className="size-6" />
              </div>
            )}

            {i === 0 && (
              <span className="absolute top-1 left-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white">
                Kapak
              </span>
            )}

            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition group-hover:opacity-100">
              {i > 0 ? (
                <button
                  type="button"
                  aria-label="Kapak yap"
                  title="Kapak yap"
                  onClick={() => makeCover(m.id, orderedIds)}
                  className="grid size-6 place-items-center rounded bg-surface/90 text-ink-3 hover:text-brand"
                >
                  <StarIcon className="size-3.5" />
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                aria-label="Sil"
                onClick={() => remove(m.id)}
                className="grid size-6 place-items-center rounded bg-surface/90 text-ink-3 hover:text-danger"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={isUploading}
          className="grid aspect-square place-items-center rounded-card border border-dashed border-line-strong text-ink-3 transition hover:bg-surface-hover hover:text-brand disabled:opacity-50"
          aria-label="Medya ekle"
        >
          <ImagePlusIcon className="size-6" />
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />

      <p className="text-xs text-ink-3">
        Fotoğraf (≤8 MB) ve video (≤50 MB). İlk görsel kapaktır.
      </p>
    </div>
  )
}
