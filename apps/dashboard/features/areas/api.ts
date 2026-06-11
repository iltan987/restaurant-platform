import { apiFetch, apiSend } from "@repo/api-client"
import {
  type Area,
  areaSchema,
  type CreateAreaInput,
  paginated,
  type UpdateAreaInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const areaPageSchema = paginated(areaSchema)

/** All areas for a restaurant (optionally one floor) — unwraps the envelope. */
export async function fetchAreas(
  slug: string,
  floorId?: string
): Promise<Area[]> {
  const qs = floorId ? `?floorId=${floorId}` : ""
  const page = await apiFetch(
    `${API}/restaurants/${slug}/areas${qs}`,
    areaPageSchema,
    { cache: "no-store" }
  )
  return page.items
}

export function createArea(
  floorId: string,
  input: CreateAreaInput
): Promise<Area> {
  return apiFetch(`${API}/floors/${floorId}/areas`, areaSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function updateArea(id: string, input: UpdateAreaInput): Promise<Area> {
  return apiFetch(`${API}/areas/${id}`, areaSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteArea(id: string, cascade = false): Promise<void> {
  const qs = cascade ? "?cascade=true" : ""
  return apiSend(`${API}/areas/${id}${qs}`, { method: "DELETE" })
}
