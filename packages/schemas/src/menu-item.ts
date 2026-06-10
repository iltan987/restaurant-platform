import { z } from "zod"

// ── Input schemas (locale-agnostic) ──
// US1 base: name + price + stock. Descriptive/dietary fields (description,
// calories, serving, allergenIds, tagIds) are added by US3 (see menu-item
// extensions there). Prices are integer minor units (kuruş).

export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(120),
  priceMinor: z.number().int().min(0),
  inStock: z.boolean().optional(),
})

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  priceMinor: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
})

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>

// ── API response schema ──

export const menuItemSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  priceMinor: z.number().int(),
  inStock: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type MenuItem = z.infer<typeof menuItemSchema>
