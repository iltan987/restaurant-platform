import { ApiError, apiFetch } from "@repo/api-client"
import { type MenuTree, menuTreeSchema } from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

/**
 * The whole public menu for an ACTIVE restaurant, by slug. Returns null on 404
 * (unknown or non-ACTIVE tenant) so the page can render a "not available"
 * surface rather than an error.
 */
export async function fetchMenuTree(slug: string): Promise<MenuTree | null> {
  try {
    return await apiFetch(`${API}/menu/by-slug/${slug}`, menuTreeSchema, {
      cache: "no-store",
    })
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null
    throw err
  }
}
