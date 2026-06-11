import { z } from "zod"

// ── Option groups (variants / extras / removable ingredients) ──
// Cross-field rules (maxSelect ≥ max(1, minSelect); required ⇒ minSelect ≥ 1)
// are enforced in the service so a violation surfaces as INVALID_OPTION_CONFIG
// rather than a generic validation error. Schemas cover per-field bounds.

export const createOptionGroupSchema = z.object({
  name: z.string().min(1).max(80),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).nullable().optional(),
  required: z.boolean().default(false),
})

export type CreateOptionGroupInput = z.infer<typeof createOptionGroupSchema>

export const updateOptionGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).nullable().optional(),
  required: z.boolean().optional(),
})

export type UpdateOptionGroupInput = z.infer<typeof updateOptionGroupSchema>

// ── Options within a group ──
// Deltas are ≥ 0 — a removable ingredient is default-on with a 0 delta, never
// a negative price.

export const createOptionSchema = z.object({
  name: z.string().min(1).max(80),
  priceDeltaMinor: z.number().int().min(0).default(0),
  defaultSelected: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
})

export type CreateOptionInput = z.infer<typeof createOptionSchema>

export const updateOptionSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  priceDeltaMinor: z.number().int().min(0).optional(),
  defaultSelected: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
})

export type UpdateOptionInput = z.infer<typeof updateOptionSchema>

// ── API response schemas ──

export const optionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  priceDeltaMinor: z.number().int(),
  defaultSelected: z.boolean(),
  isAvailable: z.boolean(),
  position: z.number().int(),
})

export type Option = z.infer<typeof optionSchema>

export const optionGroupSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  name: z.string(),
  minSelect: z.number().int(),
  maxSelect: z.number().int().nullable(),
  required: z.boolean(),
  position: z.number().int(),
  options: z.array(optionSchema),
})

export type OptionGroup = z.infer<typeof optionGroupSchema>
