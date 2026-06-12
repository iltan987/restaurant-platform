import { apiFetch } from "@repo/api-client"
import { type Activity, activitySchema, paginated } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const activityPageSchema = paginated(activitySchema)

export type ActivityPage = {
  items: Activity[]
  total: number
  page: number
  pageSize: number
}

/** Global activity feed across all restaurants. */
export function fetchActivity(page = 1): Promise<ActivityPage> {
  return apiFetch(`${API}/activity?page=${page}`, activityPageSchema, {
    cache: "no-store",
  })
}

/** Activity feed scoped to one restaurant. */
export function fetchRestaurantActivity(
  slug: string,
  page = 1
): Promise<ActivityPage> {
  return apiFetch(
    `${API}/restaurants/${slug}/activity?page=${page}`,
    activityPageSchema,
    { cache: "no-store" }
  )
}
