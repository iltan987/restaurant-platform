import { apiFetch, apiSend } from "@repo/api-client"
import {
  type CreateMenuItemInput,
  type MenuItem,
  menuItemSchema,
  type UpdateMenuItemInput,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const itemListSchema = menuItemSchema.array()

/** Items within a category, ordered. */
export function fetchItems(categoryId: string): Promise<MenuItem[]> {
  return apiFetch(`${API}/categories/${categoryId}/items`, itemListSchema, {
    cache: "no-store",
  })
}

export function createItem(
  categoryId: string,
  input: CreateMenuItemInput
): Promise<MenuItem> {
  return apiFetch(`${API}/categories/${categoryId}/items`, menuItemSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function updateItem(
  id: string,
  input: UpdateMenuItemInput
): Promise<MenuItem> {
  return apiFetch(`${API}/menu-items/${id}`, menuItemSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteItem(id: string): Promise<void> {
  return apiSend(`${API}/menu-items/${id}`, { method: "DELETE" })
}

export function reorderItems(
  categoryId: string,
  ids: string[]
): Promise<MenuItem[]> {
  return apiFetch(
    `${API}/categories/${categoryId}/items/order`,
    itemListSchema,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }
  )
}
