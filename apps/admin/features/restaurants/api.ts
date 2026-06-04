import { apiFetch } from "@repo/api-client"
import {
  type CreateRestaurantInput,
  type Restaurant,
  restaurantSchema,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

export function fetchRestaurants(): Promise<Restaurant[]> {
  return apiFetch(`${API}/restaurants`, restaurantSchema.array(), {
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
