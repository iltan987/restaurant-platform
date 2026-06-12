import { z } from "zod"

import { SLUG_MAX, SLUG_REGEX } from "@repo/core"

// ── Locale & billing enums (single source of truth for the allowed sets) ──
//
// language/currency are deliberately narrow for now — the columns exist and the
// UI is wired, but only one option each is offered. Add members here (no DB
// migration needed, they're string columns) to expand later. `plan` is backed
// by a Prisma enum, so expanding it also needs a migration.

export const languageSchema = z.enum(["tr"])
export type Language = z.infer<typeof languageSchema>

export const currencySchema = z.enum(["TRY"])
export type Currency = z.infer<typeof currencySchema>

export const planSchema = z.enum(["FREE", "PRO", "ENTERPRISE"])
export type Plan = z.infer<typeof planSchema>

// ── Input schemas (locale-agnostic — each app sets its own z.config locale) ──

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional(),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(SLUG_MAX).regex(SLUG_REGEX).optional(),
  language: languageSchema.optional(),
  currency: currencySchema.optional(),
})

export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>

/** Change the billing tier (no payment side effects yet). */
export const setPlanSchema = z.object({
  plan: planSchema,
})

export type SetPlanInput = z.infer<typeof setPlanSchema>

/** Go live / deactivate. */
export const restaurantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export type RestaurantStatusInput = z.infer<typeof restaurantStatusSchema>

/** Finish / skip / re-open onboarding (never auto-activates). */
export const onboardingStatusSchema = z.object({
  onboardingStatus: z.enum(["IN_PROGRESS", "COMPLETED", "SKIPPED"]),
})

export type OnboardingStatusInput = z.infer<typeof onboardingStatusSchema>

// ── API response schema ──

export const restaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  onboardingStatus: z.enum(["IN_PROGRESS", "COMPLETED", "SKIPPED"]),
  language: languageSchema,
  currency: currencySchema,
  plan: planSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Restaurant = z.infer<typeof restaurantSchema>

/**
 * Restaurant enriched with aggregate counts of its sub-resources. Returned by
 * the fleet list and the single-restaurant lookup so the console can render
 * setup progress, fleet cards and stat tiles without N extra requests. The base
 * `restaurantSchema` stays unchanged so create/update/status responses keep
 * their contract.
 */
export const restaurantWithCountsSchema = restaurantSchema.extend({
  floorCount: z.number().int().nonnegative(),
  areaCount: z.number().int().nonnegative(),
  tableCount: z.number().int().nonnegative(),
  categoryCount: z.number().int().nonnegative(),
  menuItemCount: z.number().int().nonnegative(),
})

export type RestaurantWithCounts = z.infer<typeof restaurantWithCountsSchema>

// ── Slug availability (live check in the create flow) ──

/** Raw user input; the server normalizes it with `slugify` before checking. */
export const slugAvailabilityQuerySchema = z.object({
  slug: z.string().min(1).max(120),
})

export type SlugAvailabilityQuery = z.infer<typeof slugAvailabilityQuerySchema>

export const slugAvailabilityResultSchema = z.object({
  /** Echo of the raw input. */
  slug: z.string(),
  /** The normalized slug that would actually be reserved. */
  normalized: z.string(),
  available: z.boolean(),
})

export type SlugAvailabilityResult = z.infer<
  typeof slugAvailabilityResultSchema
>
