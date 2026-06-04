import { z } from "zod"

import { SLUG_MAX, SLUG_REGEX } from "@repo/core"

// ── Input schemas (locale-agnostic — each app sets its own z.config locale) ──

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional(),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

// ── API response schema ──

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Restaurant = z.infer<typeof restaurantSchema>
