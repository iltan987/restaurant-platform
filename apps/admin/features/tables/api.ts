import { apiFetch, apiSend } from "@repo/api-client"
import {
  type CreateTableInput,
  type CreateTablesBulkInput,
  paginated,
  type Table,
  tableSchema,
  type UpdateTableInput,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const tablePageSchema = paginated(tableSchema)
const tableListSchema = tableSchema.array()

export async function fetchTables(slug: string): Promise<Table[]> {
  const page = await apiFetch(
    `${API}/restaurants/${slug}/tables`,
    tablePageSchema,
    { cache: "no-store" }
  )
  return page.items
}

export function createTable(
  areaId: string,
  input: CreateTableInput
): Promise<Table> {
  return apiFetch(`${API}/areas/${areaId}/tables`, tableSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function bulkCreateTables(
  areaId: string,
  input: CreateTablesBulkInput
): Promise<Table[]> {
  return apiFetch(`${API}/areas/${areaId}/tables/bulk`, tableListSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function updateTable(
  id: string,
  input: UpdateTableInput
): Promise<Table> {
  return apiFetch(`${API}/tables/${id}`, tableSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export function deleteTable(id: string): Promise<void> {
  return apiSend(`${API}/tables/${id}`, { method: "DELETE" })
}
