import { z } from "zod"

// ── Pagination (shared by every list endpoint) ──
// Query params arrive as strings → coerce. `pageSize` has no default here; each
// surface applies its own (restaurants 20; floors/areas/tables 200) when omitted.

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

/** Wraps an item schema into the `{ items, total, page, pageSize }` envelope. */
export function paginated<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
}
