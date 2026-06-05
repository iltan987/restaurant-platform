import { z } from "zod"

// ── Input schemas (locale-agnostic) ──

export const createFloorSchema = z.object({
  name: z.string().min(1).max(60),
  position: z.number().int().min(0).optional(),
})

export type CreateFloorInput = z.infer<typeof createFloorSchema>

export const updateFloorSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
})

export type UpdateFloorInput = z.infer<typeof updateFloorSchema>

// ── API response schema ──

export const floorSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Floor = z.infer<typeof floorSchema>
