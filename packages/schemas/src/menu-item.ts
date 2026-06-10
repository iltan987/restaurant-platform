import { z } from "zod"

import { SERVING_UNITS } from "@repo/core"

import { allergenSchema } from "./allergen"
import { availabilityWindowSchema } from "./availability"
import { mediaAssetSchema } from "./media"
import { optionGroupSchema } from "./option"
import { tagSchema } from "./tag"

const servingUnitSchema = z.enum(SERVING_UNITS)

// ── Input schemas (locale-agnostic) ──
// Base item plus US3 descriptive/dietary fields. Prices are integer minor
// units (kuruş). Allergen/tag assignment is by id arrays (set semantics).

export const createMenuItemSchema = z.object({
  name: z.string().min(1).max(120),
  priceMinor: z.number().int().min(0),
  inStock: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  servingAmount: z.number().positive().nullable().optional(),
  servingUnit: servingUnitSchema.nullable().optional(),
  allergenIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
})

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  priceMinor: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  servingAmount: z.number().positive().nullable().optional(),
  servingUnit: servingUnitSchema.nullable().optional(),
  allergenIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
})

export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>

// ── API response schema ──
// `servingAmount` is a Prisma Decimal → serialized as a string, so coerce.

export const menuItemSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceMinor: z.number().int(),
  inStock: z.boolean(),
  calories: z.number().int().nullable(),
  servingAmount: z.coerce.number().nullable(),
  servingUnit: servingUnitSchema.nullable(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type MenuItem = z.infer<typeof menuItemSchema>

/**
 * Full item detail (GET /menu-items/:id) — the base item plus its ordered
 * option groups (each with ordered options), assigned allergens & tags,
 * availability windows, and ordered media.
 */
export const menuItemDetailSchema = menuItemSchema.extend({
  optionGroups: z.array(optionGroupSchema),
  allergens: z.array(allergenSchema),
  tags: z.array(tagSchema),
  availabilityWindows: z.array(availabilityWindowSchema),
  media: z.array(mediaAssetSchema),
})

export type MenuItemDetail = z.infer<typeof menuItemDetailSchema>
