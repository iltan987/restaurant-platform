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
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** Shape of every error response from the API */
export interface ApiError {
  statusCode: number
  code: ErrorCode
  message: string
}
