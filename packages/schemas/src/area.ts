import { z } from "zod"

// ── Input schemas (locale-agnostic) ──

export const createAreaSchema = z.object({
  name: z.string().min(1).max(60),
  position: z.number().int().min(0).optional(),
})

export type CreateAreaInput = z.infer<typeof createAreaSchema>

export const updateAreaSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  position: z.number().int().min(0).optional(),
})

export type UpdateAreaInput = z.infer<typeof updateAreaSchema>

// ── API response schema ──

export const areaSchema = z.object({
  id: z.string(),
  floorId: z.string(),
  name: z.string(),
  position: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Area = z.infer<typeof areaSchema>
