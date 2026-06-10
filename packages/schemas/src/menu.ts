import { z } from "zod"

import { categorySchema } from "./category"
import { menuItemDetailSchema } from "./menu-item"

// ── Public menu tree (GET /menu/by-slug/:slug) 🌐 ──
// The single payload the customer app loads. Only visible (non-hidden)
// categories and their items appear; client-side search filters it in-memory.
// Each item carries `orderableNow`, computed server-side in Europe/Istanbul
// (FR-020/FR-021) so the client never reasons about time zones.

export const orderableReasonSchema = z.enum(["OUT_OF_STOCK", "OUTSIDE_WINDOW"])

export type OrderableReason = z.infer<typeof orderableReasonSchema>

/** Mirrors the `Orderable` shape from @repo/core: `ok`, plus a reason when not. */
export const orderableSchema = z.object({
  ok: z.boolean(),
  reason: orderableReasonSchema.optional(),
})

export type Orderable = z.infer<typeof orderableSchema>

/** A menu item with everything the customer view needs, plus orderability. */
export const menuTreeItemSchema = menuItemDetailSchema.extend({
  orderableNow: orderableSchema,
})

export type MenuTreeItem = z.infer<typeof menuTreeItemSchema>

export const menuTreeCategorySchema = categorySchema.extend({
  items: z.array(menuTreeItemSchema),
})

export type MenuTreeCategory = z.infer<typeof menuTreeCategorySchema>

export const menuTreeSchema = z.object({
  restaurant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  categories: z.array(menuTreeCategorySchema),
})

export type MenuTree = z.infer<typeof menuTreeSchema>
