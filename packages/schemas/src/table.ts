import { z } from "zod"

// ── Input schemas (locale-agnostic) ──

/** Create under an area (areaId comes from the path). */
export const createTableSchema = z.object({
  label: z.string().min(1).max(40),
  capacity: z.number().int().min(1).optional(),
})

export type CreateTableInput = z.infer<typeof createTableSchema>

/** Rename / set capacity / reassign area / single-table reposition. */
export const updateTableSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  capacity: z.number().int().min(1).nullable().optional(),
  areaId: z.cuid2().optional(),
  positionX: z.number().min(0).max(1).nullable().optional(),
  positionY: z.number().min(0).max(1).nullable().optional(),
})

export type UpdateTableInput = z.infer<typeof updateTableSchema>

/** Quick add-N: sequential labels into one area, created atomically. */
export const createTablesBulkSchema = z.object({
  count: z.number().int().min(1).max(200),
  startNumber: z.number().int().min(1).optional(),
  labelPrefix: z.string().max(20).optional(),
})

export type CreateTablesBulkInput = z.infer<typeof createTablesBulkSchema>

/** Batch canvas save — normalized 0..1 positions for a floor's tables. */
export const floorLayoutSchema = z.object({
  positions: z.array(
    z.object({
      tableId: z.cuid2(),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
  ),
})

export type FloorLayoutInput = z.infer<typeof floorLayoutSchema>

// ── API response schema ──

export const tableSchema = z.object({
  id: z.string(),
  areaId: z.string(),
  label: z.string(),
  capacity: z.number().int().nullable().optional(),
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Table = z.infer<typeof tableSchema>
