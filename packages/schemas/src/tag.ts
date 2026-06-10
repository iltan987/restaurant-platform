import { z } from "zod"

// ── Input schemas ──

export const createTagSchema = z.object({
  label: z.string().min(1).max(40),
  color: z.string().max(32).nullable().optional(),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export const updateTagSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  color: z.string().max(32).nullable().optional(),
})

export type UpdateTagInput = z.infer<typeof updateTagSchema>

// ── API response schema ──

export const tagSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  label: z.string(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Tag = z.infer<typeof tagSchema>
