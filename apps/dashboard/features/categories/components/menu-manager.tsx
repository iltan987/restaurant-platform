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
import { PlusIcon, SearchIcon, UtensilsCrossedIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

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
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")

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

  function startAdding() {
    setSearch("")
    setAdding(true)
  }

  function submitCategory() {
    const name = newName.trim()
    if (!name) return
    createCategory.mutate({ name })
    setNewName("")
  }

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-7 pb-20 sm:px-7">
      <PageHeader
        title="Menü"
        subtitle="Kategorileri ve ürünleri düzenleyin; sürükleyerek sıralayın."
        actions={
          <Button onClick={startAdding}>
            <PlusIcon className="size-4" />
            Kategori ekle
          </Button>
        }
      />

      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-4" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Menüde ara (ürün veya kategori)"
          aria-label="Menüde ara"
          className="h-11 pl-9"
        />
      </div>

      {adding ? (
        <div className="mb-3 flex items-center gap-2 rounded-card border border-line bg-surface p-2 shadow-soft">
          <Input
            autoFocus
            value={newName}
            maxLength={80}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCategory()
              if (e.key === "Escape") {
                setNewName("")
                setAdding(false)
              }
            }}
            placeholder="Kategori adı (örn. Başlangıçlar)"
            aria-label="Yeni kategori adı"
            className="h-10"
          />
          <Button
            onClick={submitCategory}
            disabled={!newName.trim() || createCategory.isPending}
          >
            Ekle
          </Button>
          <Button
            variant="ghost"
            className="text-ink-3"
            onClick={() => {
              setNewName("")
              setAdding(false)
            }}
          >
            İptal
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="text-ink-3" />
        </div>
      ) : categories.length === 0 && !adding ? (
        <EmptyState
          icon={<UtensilsCrossedIcon />}
          title="Henüz menünüz yok"
          description="İlk kategorinizi ekleyerek başlayın — sonra her kategoriye ürünlerinizi ekleyin."
        >
          <Button onClick={startAdding}>
            <PlusIcon className="size-4" />
            İlk kategoriyi ekle
          </Button>
        </EmptyState>
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
    </div>
  )
}
