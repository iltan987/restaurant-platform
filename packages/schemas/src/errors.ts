/**
 * Stable machine codes returned by the API for every error.
 * Frontends map these to localised (e.g. Turkish) messages; the backend
 * always attaches an English `message` for logs / other consumers.
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SLUG_TAKEN: "SLUG_TAKEN",
  RESTAURANT_NOT_FOUND: "RESTAURANT_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** Shape of every error response from the API */
export interface ApiError {
  statusCode: number
  code: ErrorCode
  message: string
}
