import { type Restaurant, restaurantSchema } from "@repo/schemas"

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

/**
 * Fetches a restaurant by slug. Returns null on 404 so callers can
 * decide whether to call notFound() — keeps the query reusable for
 * both server prefetch and future client components.
 */
export async function fetchRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  const res = await fetch(`${API}/restaurants/${slug}`, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      code?: string
      message?: string
    }
    throw new ApiError(
      body.code ?? "INTERNAL_ERROR",
      body.message ?? `Failed to fetch restaurant "${slug}" (${res.status})`
    )
  }
  const data = (await res.json()) as unknown
  return restaurantSchema.parse(data)
}
