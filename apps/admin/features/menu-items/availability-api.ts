import { apiFetch } from "@repo/api-client"
import {
  type AvailabilityWindow,
  type AvailabilityWindowInput,
  availabilityWindowSchema,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const windowListSchema = availabilityWindowSchema.array()

/** Replace-all: send the full window set (empty = always available). */
export function setAvailability(
  itemId: string,
  windows: AvailabilityWindowInput[]
): Promise<AvailabilityWindow[]> {
  return apiFetch(
    `${API}/menu-items/${itemId}/availability`,
    windowListSchema,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windows }),
    }
  )
}
