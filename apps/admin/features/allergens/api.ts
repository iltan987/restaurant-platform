import { apiFetch, apiSend } from "@repo/api-client"
import {
  type Allergen,
  allergenSchema,
  type CreateAllergenInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const allergenListSchema = allergenSchema.array()

/** All allergens for a restaurant (standard set first, then custom). */
export function fetchAllergens(restaurantId: string): Promise<Allergen[]> {
  return apiFetch(
    `${API}/restaurants/${restaurantId}/allergens`,
    allergenListSchema,
    { cache: "no-store" }
  )
}

export function createAllergen(
  restaurantId: string,
  input: CreateAllergenInput
): Promise<Allergen> {
  return apiFetch(
    `${API}/restaurants/${restaurantId}/allergens`,
    allergenSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

export function deleteAllergen(id: string): Promise<void> {
  return apiSend(`${API}/allergens/${id}`, { method: "DELETE" })
}
