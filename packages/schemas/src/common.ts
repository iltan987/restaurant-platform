import { z } from "zod"

// ── Shared building blocks across feature schemas ──

/**
 * Batch-reorder payload: the full ordered list of ids for the scope being
 * reordered (categories within a restaurant, items within a category, options
 * within a group, …). The server assigns `position` from array index.
 */
export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
})

export type ReorderInput = z.infer<typeof reorderSchema>
