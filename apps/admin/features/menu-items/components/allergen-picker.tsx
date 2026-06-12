"use client"

import { useQuery } from "@tanstack/react-query"

import { allergensQueries } from "@/features/allergens/queries"
import { useAllergenMutations } from "@/features/allergens/use-allergen-mutations"

import { menuItemsQueries } from "../queries"
import { useSetItemRelations } from "../use-set-item-relations"
import { RelationPicker } from "./relation-picker"

/**
 * Allergen picker for an item: shows the restaurant's set (standard + custom),
 * toggling assigns/unassigns immediately. Custom allergens can be created
 * inline and deleted; the standard set is create-only/undeletable.
 */
export function AllergenPicker({
  restaurantId,
  itemId,
  categoryId,
}: {
  restaurantId: string
  itemId: string
  categoryId: string
}) {
  const { data: detail } = useQuery(menuItemsQueries.detail(itemId))
  const { data: allergens = [] } = useQuery(
    allergensQueries.byRestaurant(restaurantId)
  )
  const m = useAllergenMutations(restaurantId)
  const { setAllergens } = useSetItemRelations(categoryId, itemId)

  const selectedIds = new Set(detail?.allergens.map((a) => a.id) ?? [])

  function replace(nextSelected: Set<string>) {
    setAllergens.mutate([...nextSelected])
  }

  return (
    <RelationPicker
      title="Alerjenler"
      placeholder="Özel alerjen ekle (ör. Domates)"
      options={allergens.map((a) => ({
        id: a.id,
        label: a.label,
        deletable: !a.isStandard,
      }))}
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
