import { z } from "zod"

// ── Activity / audit feed ──
// One entry per notable domain event. `meta` is a loose bag of human-readable
// bits (names, old/new values) — kept untyped on purpose until detailed
// logging lands. Keep this enum in sync with the Prisma `ActivityType`.

export const activityTypeSchema = z.enum([
  "RESTAURANT_CREATED",
  "RESTAURANT_RENAMED",
  "SLUG_CHANGED",
  "STATUS_CHANGED",
  "PLAN_CHANGED",
  "ONBOARDING_CHANGED",
  "CATEGORY_CREATED",
  "CATEGORY_DELETED",
  "MENU_ITEM_CREATED",
  "MENU_ITEM_DELETED",
])

export type ActivityType = z.infer<typeof activityTypeSchema>

export const activitySchema = z.object({
  id: z.string(),
  restaurantId: z.string().nullable(),
  type: activityTypeSchema,
  meta: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
})

export type Activity = z.infer<typeof activitySchema>
