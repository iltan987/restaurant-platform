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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useQuery } from "@tanstack/react-query"
import {
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

import { type Category } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ToneBadge } from "@/components/tone-badge"
import { ItemEditorDialog } from "@/features/menu-items/components/item-editor-dialog"
import { ItemRow } from "@/features/menu-items/components/item-row"
import { menuItemsQueries } from "@/features/menu-items/queries"
import { useReorderItems } from "@/features/menu-items/use-reorder-items"

import { useDeleteCategory } from "../use-delete-category"
import { useUpdateCategory } from "../use-update-category"

const norm = (s: string) => s.toLocaleLowerCase("tr")

/**
 * One category card: inline-editable header (rename · hide · delete) and a
 * drag-sortable list of its items. When `search` is active, reorder is
 * disabled and the section hides itself if neither its name nor any item
 * matches.
 */
export function CategorySection({
  slug,
  category,
  search,
}: {
  slug: string
  category: Category
  search: string
}) {
  const updateCategory = useUpdateCategory(slug)
  const deleteCategory = useDeleteCategory(slug)
  const reorderItems = useReorderItems(category.id)
  const { data: items = [], isLoading } = useQuery(
    menuItemsQueries.byCategory(category.id)
  )

  const [draftName, setDraftName] = useState(category.name)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: search !== "" })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const draggable = search === ""
  const filtered = search
    ? items.filter((i) => norm(i.name).includes(norm(search)))
    : items
  if (
    search &&
    !norm(category.name).includes(norm(search)) &&
    filtered.length === 0
  ) {
    return null
  }

  function commitName() {
    const next = draftName.trim()
    if (next && next !== category.name) {
      updateCategory.mutate({ id: category.id, input: { name: next } })
    } else {
      setDraftName(category.name)
    }
  }

  function onItemDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderItems.mutate(arrayMove(items, oldIndex, newIndex).map((i) => i.id))
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-soft",
        isDragging && "relative z-10 shadow-float",
        category.isHidden && "opacity-60"
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-line-subtle px-3 py-2.5">
        <button
          type="button"
          aria-label="Kategoriyi sürükle"
          className={cn(
            "hidden size-6 shrink-0 place-items-center rounded text-ink-4 sm:grid",
            draggable
              ? "cursor-grab active:cursor-grabbing"
              : "pointer-events-none opacity-30"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>

        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
            if (e.key === "Escape") {
              setDraftName(category.name)
              e.currentTarget.blur()
            }
          }}
          aria-label="Kategori adı"
          maxLength={80}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none hover:bg-surface-muted focus:border-brand focus:bg-surface focus:ring-3 focus:ring-brand/25"
        />

        {category.isHidden ? <ToneBadge tone="neutral">Gizli</ToneBadge> : null}
        <span className="shrink-0 px-1 font-mono text-xs text-ink-3 tabular-nums">
          {items.length}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="text-ink-3"
          aria-label={category.isHidden ? "Göster" : "Gizle"}
          onClick={() =>
            updateCategory.mutate({
              id: category.id,
              input: { isHidden: !category.isHidden },
            })
          }
        >
          {category.isHidden ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </Button>

        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Kategoriyi sil"
              className="text-ink-3 hover:text-danger"
            >
              <Trash2Icon className="size-4" />
            </Button>
          }
          title="Kategoriyi sil"
          description={`"${category.name}" kategorisini silmek istediğinize emin misiniz? Önce içindeki ürünleri kaldırmanız gerekir.`}
          confirmLabel="Sil"
          destructive
          onConfirm={() => deleteCategory.mutate(category.id)}
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-8">
          <Spinner className="text-ink-3" />
        </div>
      ) : (
        <DndContext
          id={`menu-items-${category.id}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onItemDragEnd}
        >
          <SortableContext
            items={filtered.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-ink-3">
                {search ? "Eşleşen ürün yok." : "Henüz ürün eklenmedi."}
              </p>
            ) : (
              filtered.map((item) => (
                <ItemRow
                  key={item.id}
                  categoryId={category.id}
                  item={item}
                  draggable={draggable}
                />
              ))
            )}
          </SortableContext>
        </DndContext>
      )}

      <ItemEditorDialog
        categoryId={category.id}
        trigger={
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-line-subtle bg-surface-subtle px-3 py-2.5 text-sm font-medium text-brand transition-colors hover:bg-surface-muted"
          >
            <PlusIcon className="size-4" />
            Ürün ekle
          </button>
        }
      />
    </div>
  )
}
