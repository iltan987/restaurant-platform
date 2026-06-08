import { apiFetch, apiSend } from "@repo/api-client"
import {
  type Area,
  areaSchema,
  type CreateAreaInput,
  paginated,
  type UpdateAreaInput,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const areaPageSchema = paginated(areaSchema)

export async function fetchAreas(slug: string): Promise<Area[]> {
  const page = await apiFetch(
    `${API}/restaurants/${slug}/areas`,
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

export function deleteArea(id: string): Promise<void> {
  return apiSend(`${API}/areas/${id}`, { method: "DELETE" })
}
