import { apiFetch } from "@repo/api-client"
import {
  type CreateRestaurantInput,
  paginated,
  type Restaurant,
  restaurantSchema,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const restaurantPageSchema = paginated(restaurantSchema)

export type RestaurantPage = {
  items: Restaurant[]
  total: number
  page: number
  pageSize: number
}

export function fetchRestaurants(page = 1): Promise<RestaurantPage> {
  return apiFetch(`${API}/restaurants?page=${page}`, restaurantPageSchema, {
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
