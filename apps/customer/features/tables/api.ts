import { ApiError, apiFetch } from "@repo/api-client"
import { type Table, tableSchema } from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

/**
 * Resolves a single table within a restaurant. Returns null on 404 (unknown
 * restaurant or table) so the storefront can gate the menu behind a valid table.
 */
export async function fetchTable(
  slug: string,
  tableId: string
): Promise<Table | null> {
  try {
    return await apiFetch(
      `${API}/restaurants/${slug}/tables/${tableId}`,
      tableSchema,
      { cache: "no-store" }
    )
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null
    throw err
  }
}
