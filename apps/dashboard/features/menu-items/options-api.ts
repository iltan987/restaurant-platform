import { apiFetch, apiSend } from "@repo/api-client"
import {
  type CreateOptionGroupInput,
  type CreateOptionInput,
  type Option,
  type OptionGroup,
  optionGroupSchema,
  optionSchema,
  type UpdateOptionGroupInput,
  type UpdateOptionInput,
} from "@repo/schemas"

const API = process.env.NEXT_PUBLIC_API_URL
if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set")

const json = (body: unknown) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

// ── Option groups ──

export function createGroup(
  itemId: string,
  input: CreateOptionGroupInput
): Promise<OptionGroup> {
  return apiFetch(
    `${API}/menu-items/${itemId}/option-groups`,
    optionGroupSchema,
    {
      method: "POST",
      ...json(input),
    }
  )
}

export function updateGroup(
  groupId: string,
  input: UpdateOptionGroupInput
): Promise<OptionGroup> {
  return apiFetch(`${API}/option-groups/${groupId}`, optionGroupSchema, {
    method: "PATCH",
    ...json(input),
  })
}

export function deleteGroup(groupId: string): Promise<void> {
  return apiSend(`${API}/option-groups/${groupId}`, { method: "DELETE" })
}

// ── Options ──

export function createOption(
  groupId: string,
  input: CreateOptionInput
): Promise<Option> {
  return apiFetch(`${API}/option-groups/${groupId}/options`, optionSchema, {
    method: "POST",
    ...json(input),
  })
}

export function updateOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<Option> {
  return apiFetch(`${API}/options/${optionId}`, optionSchema, {
    method: "PATCH",
    ...json(input),
  })
}

export function deleteOption(optionId: string): Promise<void> {
  return apiSend(`${API}/options/${optionId}`, { method: "DELETE" })
}
