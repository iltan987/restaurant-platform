import { ApiError } from "./api-error"

/** Minimal structural shape of a parser — a Zod schema's `.parse` satisfies it. */
export interface Parser<T> {
  parse: (data: unknown) => T
}

/**
 * Fetches JSON from the API and validates it with `schema`.
 *
 * Throws {@link ApiError} on any non-OK response, reading the API's
 * `{ code, message }` error body when present. Callers that want to treat a
 * specific status as a non-error (e.g. 404 → null) should catch ApiError and
 * inspect `statusCode`.
 */
export async function apiFetch<T>(
  url: string,
  schema: Parser<T>,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init)

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string
      message?: string
    }
    throw new ApiError(
      res.status,
      body.code ?? "INTERNAL_ERROR",
      body.message ?? `Request failed (${res.status})`
    )
  }

  const data = (await res.json()) as unknown
  return schema.parse(data)
}
