import { ApiError, apiFetch } from "@repo/api-client"
import {
  type OnboardingStatusInput,
  type Restaurant,
  restaurantSchema,
  type RestaurantStatusInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

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

/** Go live / deactivate. Enforces the ≥1-table rule server-side. */
export function setRestaurantStatus(
  id: string,
  input: RestaurantStatusInput
): Promise<Restaurant> {
  return apiFetch(`${API}/restaurants/${id}/status`, restaurantSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

/** Finish / skip onboarding. Never auto-activates the restaurant. */
export function setRestaurantOnboarding(
  id: string,
  input: OnboardingStatusInput
): Promise<Restaurant> {
  return apiFetch(`${API}/restaurants/${id}/onboarding`, restaurantSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}
