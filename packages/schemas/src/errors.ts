/**
 * Stable machine codes returned by the API for every error.
 * Frontends map these to localised (e.g. Turkish) messages; the backend
 * always attaches an English `message` for logs / other consumers.
 *
 * Convention:
 *   Generic codes  — emitted by the global exception filter as fallbacks when no
 *                    structured body is present. HTTP-level semantics only.
 *   Domain codes   — thrown explicitly by services when the UI needs a distinct
 *                    message. Always prefer explicit over letting the filter infer.
 */
export const ErrorCode = {
  // ── Generic (global filter fallbacks) ──────────────────────────────────
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",

  // ── Domain-specific (thrown explicitly by services) ────────────────────
  SLUG_TAKEN: "SLUG_TAKEN",
  RESTAURANT_NOT_FOUND: "RESTAURANT_NOT_FOUND",
  GO_LIVE_REQUIRES_TABLE: "GO_LIVE_REQUIRES_TABLE",
  FLOOR_NAME_TAKEN: "FLOOR_NAME_TAKEN",
  FLOOR_NOT_FOUND: "FLOOR_NOT_FOUND",
  FLOOR_NOT_EMPTY: "FLOOR_NOT_EMPTY",
  AREA_NAME_TAKEN: "AREA_NAME_TAKEN",
  AREA_NOT_FOUND: "AREA_NOT_FOUND",
  AREA_NOT_EMPTY: "AREA_NOT_EMPTY",
  TABLE_LABEL_TAKEN: "TABLE_LABEL_TAKEN",
  TABLE_NOT_FOUND: "TABLE_NOT_FOUND",
  TABLE_LIMIT_REACHED: "TABLE_LIMIT_REACHED",

  // ── Menu domain (feature 003) ──────────────────────────────────────────
  CATEGORY_NAME_TAKEN: "CATEGORY_NAME_TAKEN",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CATEGORY_NOT_EMPTY: "CATEGORY_NOT_EMPTY",
  MENU_ITEM_NOT_FOUND: "MENU_ITEM_NOT_FOUND",
  ALLERGEN_LABEL_TAKEN: "ALLERGEN_LABEL_TAKEN",
  ALLERGEN_NOT_FOUND: "ALLERGEN_NOT_FOUND",
  ALLERGEN_STANDARD_PROTECTED: "ALLERGEN_STANDARD_PROTECTED",
  TAG_LABEL_TAKEN: "TAG_LABEL_TAKEN",
  TAG_NOT_FOUND: "TAG_NOT_FOUND",
  OPTION_GROUP_NOT_FOUND: "OPTION_GROUP_NOT_FOUND",
  OPTION_NOT_FOUND: "OPTION_NOT_FOUND",
  INVALID_OPTION_CONFIG: "INVALID_OPTION_CONFIG",
  AVAILABILITY_WINDOW_INVALID: "AVAILABILITY_WINDOW_INVALID",
  MEDIA_LIMIT_REACHED: "MEDIA_LIMIT_REACHED",
  MEDIA_TYPE_NOT_ALLOWED: "MEDIA_TYPE_NOT_ALLOWED",
  MEDIA_TOO_LARGE: "MEDIA_TOO_LARGE",
  MEDIA_OBJECT_NOT_FOUND: "MEDIA_OBJECT_NOT_FOUND",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** Shape of every error response from the API */
export interface ApiError {
  statusCode: number
  code: ErrorCode
  message: string
}
