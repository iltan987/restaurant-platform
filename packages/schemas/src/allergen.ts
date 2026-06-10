import { z } from "zod"

// ── Input schemas ──
// Custom allergens only carry a label; `isStandard` is server-controlled (the
// seeded set is protected from deletion).

export const createAllergenSchema = z.object({
  label: z.string().min(1).max(60),
})

export type CreateAllergenInput = z.infer<typeof createAllergenSchema>

export const updateAllergenSchema = z.object({
  label: z.string().min(1).max(60),
})

export type UpdateAllergenInput = z.infer<typeof updateAllergenSchema>

// ── API response schema ──

export const allergenSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  label: z.string(),
  isStandard: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Allergen = z.infer<typeof allergenSchema>
