import {
  type CreateRestaurantInput,
  type Restaurant,
  restaurantSchema,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const res = await fetch(`${API}/restaurants`, { cache: "no-store" })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string }
    throw new ApiError(
      body.code ?? "INTERNAL_ERROR",
      "Failed to fetch restaurants"
    )
  }
  const data = (await res.json()) as unknown
  return restaurantSchema.array().parse(data)
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<Restaurant> {
  const res = await fetch(`${API}/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string
      message?: string
    }
    throw new ApiError(
      body.code ?? "INTERNAL_ERROR",
      body.message ?? "Request failed"
    )
  }
  const data = (await res.json()) as unknown
  return restaurantSchema.parse(data)
}
