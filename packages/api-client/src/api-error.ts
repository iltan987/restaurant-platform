/**
 * Error thrown by {@link apiFetch} when the API responds with a non-OK status.
 *
 * `code` is the stable machine code from the API error body (see the
 * `ErrorCode` enum in @repo/schemas); `statusCode` is the HTTP status, so
 * callers can branch on it — e.g. treat 404 as "not found" (return null)
 * rather than surfacing a hard error.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}
