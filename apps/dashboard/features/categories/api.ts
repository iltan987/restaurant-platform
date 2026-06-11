import { apiFetch, apiSend } from "@repo/api-client"
import {
  type Category,
  categorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const categoryListSchema = categorySchema.array()

/** All categories for a restaurant (ordered, incl. hidden) — by slug. */
export function fetchCategories(slug: string): Promise<Category[]> {
  return apiFetch(`${API}/restaurants/${slug}/categories`, categoryListSchema, {
    cache: "no-store",
  })
}

export function createCategory(
  restaurantId: string,
  input: CreateCategoryInput
): Promise<Category> {
  return apiFetch(
    `${API}/restaurants/${restaurantId}/categories`,
    categorySchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

export function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<Category> {
  return apiFetch(`${API}/categories/${id}`, categorySchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteCategory(id: string): Promise<void> {
  return apiSend(`${API}/categories/${id}`, { method: "DELETE" })
}

export function reorderCategories(
  restaurantId: string,
  ids: string[]
): Promise<Category[]> {
  return apiFetch(
    `${API}/restaurants/${restaurantId}/categories/order`,
    categoryListSchema,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }
  )
}
