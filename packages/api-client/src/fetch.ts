import { ApiError } from "./api-error"

/** Minimal structural shape of a parser — a Zod schema's `.parse` satisfies it. */
export interface Parser<T> {
  parse: (data: unknown) => T
}

/** Build an {@link ApiError} from a non-OK response, reading its `{ code, message }` body. */
async function errorFrom(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    code?: string
    message?: string
  }
  return new ApiError(
    res.status,
    body.code ?? "INTERNAL_ERROR",
    body.message ?? `Request failed (${res.status})`
  )
}

/**
 * Fetches JSON from the API and validates it with `schema`.
 *
 * Throws {@link ApiError} on any non-OK response, reading the API's
 * `{ code, message }` error body when present. Callers that want to treat a
 * specific status as a non-error (e.g. 404 → null) should catch ApiError and
 * inspect `statusCode`.
 *
 * Defaults to `credentials: "include"` so the session cookie rides along on
 * cross-origin browser→API calls (the apps and the API live on different
 * origins). Pass `credentials` in `init` to override.
 */
export async function apiFetch<T>(
  url: string,
  schema: Parser<T>,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init })
  if (!res.ok) throw await errorFrom(res)

  const data = (await res.json()) as unknown
  return schema.parse(data)
}

/**
 * Sends a request whose response body is irrelevant — DELETEs and other
 * `204 No Content` endpoints. Throws {@link ApiError} on a non-OK response;
 * resolves to void otherwise (the body, if any, is not read).
 */
export async function apiSend(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, { credentials: "include", ...init })
  if (!res.ok) throw await errorFrom(res)
}
