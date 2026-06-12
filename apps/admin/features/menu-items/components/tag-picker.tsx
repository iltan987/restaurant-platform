"use client"

import { useQuery } from "@tanstack/react-query"

import { tagsQueries } from "@/features/tags/queries"
import { useTagMutations } from "@/features/tags/use-tag-mutations"

import { menuItemsQueries } from "../queries"
import { useSetItemRelations } from "../use-set-item-relations"
import { RelationPicker } from "./relation-picker"

/**
 * Tag picker for an item: toggling assigns/unassigns immediately; tags can be
 * created inline and deleted.
 */
export function TagPicker({
  restaurantId,
  itemId,
  categoryId,
}: {
  restaurantId: string
  itemId: string
  categoryId: string
}) {
  const { data: detail } = useQuery(menuItemsQueries.detail(itemId))
  const { data: tags = [] } = useQuery(tagsQueries.byRestaurant(restaurantId))
  const m = useTagMutations(restaurantId)
  const { setTags } = useSetItemRelations(categoryId, itemId)

  const selectedIds = new Set(detail?.tags.map((t) => t.id) ?? [])

  function replace(nextSelected: Set<string>) {
    setTags.mutate([...nextSelected])
  }

  return (
    <RelationPicker
      title="Etiketler"
      placeholder="Etiket ekle (ör. vegan, acılı)"
      options={tags.map((t) => ({ id: t.id, label: t.label, deletable: true }))}
      selectedIds={selectedIds}
      onToggle={(id) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        replace(next)
      }}
      creating={m.create.isPending}
      onCreate={(label) => m.create.mutate({ label })}
      onDelete={(id) => {
        if (selectedIds.has(id)) {
          const next = new Set(selectedIds)
          next.delete(id)
          replace(next)
        }
        m.remove.mutate(id)
      }}
    />
  )
}
