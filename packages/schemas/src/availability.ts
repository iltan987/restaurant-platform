import { z } from "zod"

import { DAYS_OF_WEEK } from "@repo/core"

const dayOfWeekSchema = z.enum(DAYS_OF_WEEK)

// ── Input (replace-all) ──
// The editor always sends the full window set; the cross-field rule
// (startMin ≠ endMin; endMin < startMin = crosses midnight) is enforced in the
// service so a violation surfaces as AVAILABILITY_WINDOW_INVALID.

export const availabilityWindowInputSchema = z.object({
  days: z.array(dayOfWeekSchema).min(1),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(0).max(1439),
})

export type AvailabilityWindowInput = z.infer<
  typeof availabilityWindowInputSchema
>

export const setAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowInputSchema),
})

export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>

// ── API response schema ──

export const availabilityWindowSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  days: z.array(dayOfWeekSchema),
  startMin: z.number().int(),
  endMin: z.number().int(),
})

export type AvailabilityWindow = z.infer<typeof availabilityWindowSchema>
