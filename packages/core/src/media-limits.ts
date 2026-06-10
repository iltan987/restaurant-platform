/**
 * Media upload limits, centralized so the API enforces them at presign + on
 * confirm (HEAD verify) and the dashboard pre-checks the same values before
 * requesting an upload URL (research §2). Sizes are bytes.
 */

const MB = 1024 * 1024

/** Max media assets per menu item. */
export const MEDIA_MAX_PER_ITEM = 5

/** Allowed MIME types per media kind, with the per-type max size. */
export const MEDIA_LIMITS = {
  PHOTO: {
    maxBytes: 8 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  VIDEO: {
    maxBytes: 50 * MB,
    mimeTypes: ["video/mp4", "video/webm"],
  },
} as const

export type MediaKind = keyof typeof MEDIA_LIMITS

/** Whether a MIME type is allowed for the given media kind. */
export function isAllowedMime(kind: MediaKind, mimeType: string): boolean {
  return (MEDIA_LIMITS[kind].mimeTypes as readonly string[]).includes(mimeType)
}

/** Whether a byte size is within the limit for the given media kind. */
export function isWithinSize(kind: MediaKind, sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MEDIA_LIMITS[kind].maxBytes
}
