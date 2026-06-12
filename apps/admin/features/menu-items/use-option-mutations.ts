"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  type CreateOptionGroupInput,
  type CreateOptionInput,
  type UpdateOptionGroupInput,
  type UpdateOptionInput,
} from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import {
  createGroup,
  createOption,
  deleteGroup,
  deleteOption,
  updateGroup,
  updateOption,
} from "./options-api"

/**
 * All option-group/option writes for one item. Each is a sub-resource saved
 * immediately (like the structure editors), so they share the item-detail
 * query key and re-fetch the full ordered tree on settle.
 */
export function useOptionMutations(itemId: string) {
  const queryClient = useQueryClient()
  const key = ["menu-item", itemId] as const
  const settle = {
    onError: (err: unknown) => toastApiError(err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  }

  return {
    createGroup: useMutation({
      mutationFn: (input: CreateOptionGroupInput) => createGroup(itemId, input),
      ...settle,
    }),
    updateGroup: useMutation({
      mutationFn: ({
        groupId,
        input,
      }: {
        groupId: string
        input: UpdateOptionGroupInput
      }) => updateGroup(groupId, input),
      ...settle,
    }),
    deleteGroup: useMutation({
      mutationFn: (groupId: string) => deleteGroup(groupId),
      ...settle,
    }),
    createOption: useMutation({
      mutationFn: ({
        groupId,
        input,
      }: {
        groupId: string
        input: CreateOptionInput
      }) => createOption(groupId, input),
      ...settle,
    }),
    updateOption: useMutation({
      mutationFn: ({
        optionId,
        input,
      }: {
        optionId: string
        input: UpdateOptionInput
      }) => updateOption(optionId, input),
      ...settle,
    }),
    deleteOption: useMutation({
      mutationFn: (optionId: string) => deleteOption(optionId),
      ...settle,
    }),
  }
}
