import { z } from "zod"

// ── Input schemas (locale-agnostic) ──

export const createAreaSchema = z.object({
  name: z.string().min(1).max(60),
  // Optional short prefix for this area's table labels (e.g. "B" → "B1", "B2").
  code: z.string().trim().min(1).max(5).optional(),
  position: z.number().int().min(0).optional(),
})

export type CreateAreaInput = z.infer<typeof createAreaSchema>

export const updateAreaSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  // `null` clears the prefix; a string sets it.
  code: z.string().trim().min(1).max(5).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

export type UpdateAreaInput = z.infer<typeof updateAreaSchema>

// ── API response schema ──

export const areaSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Area = z.infer<typeof areaSchema>
