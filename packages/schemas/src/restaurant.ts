import { z } from "zod"

import { SLUG_MAX, SLUG_REGEX } from "@repo/core"

// ── Input schemas (locale-agnostic — each app sets its own z.config locale) ──

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional(),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional(),
})

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>

/** Go live / deactivate. */
export const restaurantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export type RestaurantStatusInput = z.infer<typeof restaurantStatusSchema>

/** Finish / skip onboarding (never auto-activates). */
export const onboardingStatusSchema = z.object({
  onboardingStatus: z.enum(["COMPLETED", "SKIPPED"]),
})

export type OnboardingStatusInput = z.infer<typeof onboardingStatusSchema>

// ── API response schema ──

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  onboardingStatus: z.enum(["IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Restaurant = z.infer<typeof restaurantSchema>
