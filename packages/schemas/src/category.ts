import { z } from "zod"

// ── Input schemas (locale-agnostic) ──

export const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  isHidden: z.boolean().optional(),
})

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ── API response schema ──

export const categorySchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  position: z.number().int(),
  isHidden: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Category = z.infer<typeof categorySchema>
