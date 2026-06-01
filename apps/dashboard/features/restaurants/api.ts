import { type Restaurant, restaurantSchema } from "@repo/schemas"
import { ApiError, apiFetch } from "@repo/api-client"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

/**
 * Fetches a restaurant by slug. Returns null on 404 so callers can
 * decide whether to call notFound() — keeps the query reusable for
 * both server prefetch and future client components.
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
