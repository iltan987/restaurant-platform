"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { formatPriceMinor } from "@repo/core"
import { type MenuItem } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"

import { useDeleteItem } from "../use-delete-item"
import { useUpdateItem } from "../use-update-item"
import { ItemEditorDialog } from "./item-editor-dialog"

/** One menu item: drag handle · name · price · stock toggle · edit · delete. */
export function ItemRow({
  categoryId,
  item,
  draggable,
}: {
  categoryId: string
  item: MenuItem
  draggable: boolean
}) {
  const del = useDeleteItem(categoryId)
  const update = useUpdateItem(categoryId)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !draggable })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 border-t px-3 py-2 first:border-t-0",
        isDragging && "relative z-10 bg-card shadow-sm",
        !item.inStock && "opacity-70"
      )}
    >
      <button
        type="button"
        aria-label="Sürükle"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded text-muted-foreground",
          draggable ? "cursor-grab active:cursor-grabbing" : "opacity-30"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {item.name}
      </span>

      {!item.inStock && <Badge variant="secondary">Tükendi</Badge>}

      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {formatPriceMinor(item.priceMinor)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={() =>
          update.mutate({ id: item.id, input: { inStock: !item.inStock } })
        }
      >
        {item.inStock ? "Tükendi işaretle" : "Stoğa al"}
      </Button>

      <ItemEditorDialog
        categoryId={categoryId}
        item={item}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Düzenle">
            <PencilIcon className="size-4" />
          </Button>
        }
      />

      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sil"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </Button>
        }
        title="Ürünü sil"
        description={`"${item.name}" ürününü silmek istediğinize emin misiniz?`}
        confirmLabel="Sil"
        destructive
        onConfirm={() => del.mutate(item.id)}
      />
    </div>
  )
}
