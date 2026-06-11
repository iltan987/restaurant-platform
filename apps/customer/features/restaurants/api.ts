import { ApiError, apiFetch } from "@repo/api-client"
import { type Restaurant, restaurantSchema } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

/**
 * Fetches a restaurant by slug. Returns null on 404 so the storefront can show
 * a "not available" surface rather than an error.
 */
export async function fetchRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  try {
    return await apiFetch(`${API}/restaurants/${slug}`, restaurantSchema, {
      cache: "no-store",
    })
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) return null
    throw err
  }
}
