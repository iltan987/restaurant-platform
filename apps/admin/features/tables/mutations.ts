"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  type CreateTableInput,
  type CreateTablesBulkInput,
  type UpdateTableInput,
} from "@repo/schemas"

import { toastApiError } from "@/lib/toast-error"

import { bulkCreateTables, createTable, deleteTable, updateTable } from "./api"

export function useCreateTable(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      areaId,
      input,
    }: {
      areaId: string
      input: CreateTableInput
    }) => createTable(areaId, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tables", slug] }),
  })
}

export function useBulkCreateTables(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      areaId,
      input,
    }: {
      areaId: string
      input: CreateTablesBulkInput
    }) => bulkCreateTables(areaId, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tables", slug] }),
  })
}

export function useUpdateTable(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTableInput }) =>
      updateTable(id, input),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tables", slug] }),
  })
}

export function useDeleteTable(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onError: toastApiError,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tables", slug] }),
  })
}
