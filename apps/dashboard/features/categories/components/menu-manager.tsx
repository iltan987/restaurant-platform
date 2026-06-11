"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useQuery } from "@tanstack/react-query"
import { SearchIcon } from "lucide-react"
import { useState } from "react"

import { Input } from "@repo/ui/components/ui/input"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { InlineAdd } from "@/components/inline-add"

import { categoriesQueries } from "../queries"
import { useCreateCategory } from "../use-create-category"
import { useReorderCategories } from "../use-reorder-categories"
import { CategorySection } from "./category-section"

/**
 * Staff menu-management surface: search across the whole menu, drag-reorder
 * categories (each section reorders its own items), rename/hide/delete
 * categories, and create/edit priced items. Separate from the setup wizard —
 * this is day-to-day menu configuration (US1).
 */
export function MenuManager({
  slug,
  restaurantId,
}: {
  slug: string
  restaurantId: string
}) {
  const { data: categories = [], isLoading } = useQuery(
    categoriesQueries.bySlug(slug)
  )
  const createCategory = useCreateCategory(slug, restaurantId)
  const reorderCategories = useReorderCategories(slug, restaurantId)
  const [search, setSearch] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderCategories.mutate(
      arrayMove(categories, oldIndex, newIndex).map((c) => c.id)
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Menü</h1>
        <p className="text-sm text-muted-foreground">
          Kategorileri ve ürünleri düzenleyin. Sürükleyerek sıralayın.
        </p>
      </header>

      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Menüde ara (ürün veya kategori)"
          aria-label="Menüde ara"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-12">
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Henüz kategori yok. Aşağıdan ilk kategorinizi ekleyin.
        </p>
      ) : (
        <DndContext
          id="menu-categories"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <CategorySection
                  key={category.id}
                  slug={slug}
                  category={category}
                  search={search}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <InlineAdd
          placeholder="Yeni kategori ekle"
          maxLength={80}
          pending={createCategory.isPending}
          onAdd={(name) => createCategory.mutate({ name })}
        />
      </div>
    </div>
  )
}
