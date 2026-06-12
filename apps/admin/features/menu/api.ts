import { z } from "zod"

import { apiFetch } from "@repo/api-client"
import { type Category, categorySchema } from "@repo/schemas"

import { apiBase as API } from "@/lib/api-base"

const categoriesSchema = z.array(categorySchema)

/** Read-only menu category list for a restaurant (ordered by position). */
export function fetchCategories(slug: string): Promise<Category[]> {
  return apiFetch(`${API}/restaurants/${slug}/categories`, categoriesSchema, {
    cache: "no-store",
  })
}
