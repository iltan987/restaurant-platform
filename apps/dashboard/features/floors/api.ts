import { apiFetch, apiSend } from "@repo/api-client"
import {
  type CreateFloorInput,
  type Floor,
  type FloorLayoutInput,
  floorSchema,
  paginated,
  type Table,
  tableSchema,
  type UpdateFloorInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const floorPageSchema = paginated(floorSchema)

/** All floors for a restaurant (ordered by position) — unwraps the envelope. */
export async function fetchFloors(slug: string): Promise<Floor[]> {
  const page = await apiFetch(
    `${API}/restaurants/${slug}/floors`,
    floorPageSchema,
    { cache: "no-store" }
  )
  return page.items
}

export function createFloor(
  restaurantId: string,
  input: CreateFloorInput
): Promise<Floor> {
  return apiFetch(`${API}/restaurants/${restaurantId}/floors`, floorSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function updateFloor(
  id: string,
  input: UpdateFloorInput
): Promise<Floor> {
  return apiFetch(`${API}/floors/${id}`, floorSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteFloor(id: string, cascade = false): Promise<void> {
  const qs = cascade ? "?cascade=true" : ""
  return apiSend(`${API}/floors/${id}${qs}`, { method: "DELETE" })
}

const tableListSchema = tableSchema.array()

/** Batch-saves canvas positions (normalized 0..1) for a floor's tables. */
export function saveFloorLayout(
  floorId: string,
  positions: FloorLayoutInput["positions"]
): Promise<Table[]> {
  return apiFetch(`${API}/floors/${floorId}/layout`, tableListSchema, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ positions }),
  })
}
