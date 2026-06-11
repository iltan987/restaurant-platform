import { apiFetch, apiSend } from "@repo/api-client"
import { type CreateTagInput, type Tag, tagSchema } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const tagListSchema = tagSchema.array()

/** All reusable tags for a restaurant (by label). */
export function fetchTags(restaurantId: string): Promise<Tag[]> {
  return apiFetch(`${API}/restaurants/${restaurantId}/tags`, tagListSchema, {
    cache: "no-store",
  })
}

export function createTag(
  restaurantId: string,
  input: CreateTagInput
): Promise<Tag> {
  return apiFetch(`${API}/restaurants/${restaurantId}/tags`, tagSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteTag(id: string): Promise<void> {
  return apiSend(`${API}/tags/${id}`, { method: "DELETE" })
}
