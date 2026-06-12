import { apiFetch, apiSend } from "@repo/api-client"
import {
  type CreateRestaurantInput,
  paginated,
  type Restaurant,
  restaurantSchema,
  type RestaurantStatusInput,
  type RestaurantWithCounts,
  restaurantWithCountsSchema,
  type SlugAvailabilityResult,
  slugAvailabilityResultSchema,
  type UpdateRestaurantInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const restaurantPageSchema = paginated(restaurantWithCountsSchema)

export type RestaurantPage = {
  items: RestaurantWithCounts[]
  total: number
  page: number
  pageSize: number
}

export function fetchRestaurants(page = 1): Promise<RestaurantPage> {
  return apiFetch(`${API}/restaurants?page=${page}`, restaurantPageSchema, {
    cache: "no-store",
  })
}

export function fetchRestaurantBySlug(
  slug: string
): Promise<RestaurantWithCounts> {
  return apiFetch(`${API}/restaurants/${slug}`, restaurantWithCountsSchema, {
    cache: "no-store",
  })
}

export function createRestaurant(
  input: CreateRestaurantInput
): Promise<Restaurant> {
  return apiFetch(`${API}/restaurants`, restaurantSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

/** Live slug availability for the create flow. Server normalizes the input. */
export function fetchSlugAvailability(
  slug: string
): Promise<SlugAvailabilityResult> {
  return apiFetch(
    `${API}/restaurants/slug-available?slug=${encodeURIComponent(slug)}`,
    slugAvailabilityResultSchema,
    { cache: "no-store" }
  )
}

/** Edit name/slug. A slug change is re-uniqued server-side (SLUG_TAKEN). */
export function updateRestaurant(
  id: string,
  input: UpdateRestaurantInput
): Promise<Restaurant> {
  return apiFetch(`${API}/restaurants/${id}`, restaurantSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

/** Activate / deactivate. Activating enforces the ≥1-table rule server-side. */
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

/** Delete a restaurant (cascades floors → areas → tables). */
export function deleteRestaurant(id: string): Promise<void> {
  return apiSend(`${API}/restaurants/${id}`, { method: "DELETE" })
}
