"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
  UtensilsCrossedIcon,
} from "lucide-react"

import { formatPriceMinor, SERVING_UNITS } from "@repo/core"
import { type MenuItemListEntry } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

type ServingUnit = (typeof SERVING_UNITS)[number]

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ToneBadge } from "@/components/tone-badge"

import { useDeleteItem } from "../use-delete-item"
import { useUpdateItem } from "../use-update-item"
import { ItemEditorDialog } from "./item-editor-dialog"

const UNIT_LABEL: Record<ServingUnit, string> = {
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITER: "ml",
  LITER: "L",
  PIECE: "adet",
  PORTION: "porsiyon",
}

/** A rich menu-item row: thumbnail · name + dietary badges/meta · price · actions. */
export function ItemRow({
  categoryId,
  item,
  draggable,
}: {
  categoryId: string
  item: MenuItemListEntry
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

  const meta: string[] = []
  if (item.servingAmount && item.servingUnit) {
    meta.push(
      `${item.servingAmount.toLocaleString("tr-TR")} ${UNIT_LABEL[item.servingUnit]}`
    )
  }
  if (item.calories != null) meta.push(`${item.calories} kcal`)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 border-t border-line-subtle px-3 py-2.5 first:border-t-0",
        isDragging && "relative z-10 rounded-lg bg-surface shadow-raised",
        !item.inStock && "opacity-70"
      )}
    >
      <button
        type="button"
        aria-label="Sürükle"
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

      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-line-subtle bg-surface-muted">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-4">
            <UtensilsCrossedIcon className="size-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {item.name}
          </span>
          {!item.inStock ? (
            <ToneBadge tone="danger" className="shrink-0">
              Tükendi
            </ToneBadge>
          ) : null}
        </div>
        {(item.tags.length > 0 || meta.length > 0) && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <ToneBadge key={tag.id} tone="success" className="shrink-0">
                {tag.label}
              </ToneBadge>
            ))}
            {item.tags.length > 3 ? (
              <span className="shrink-0 text-xs text-ink-4">
                +{item.tags.length - 3}
              </span>
            ) : null}
            {meta.length > 0 ? (
              <span className="truncate text-xs text-ink-3">
                {meta.join(" · ")}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <span className="shrink-0 font-mono text-sm font-medium text-ink tabular-nums">
        {formatPriceMinor(item.priceMinor)}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-ink-2"
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Düzenle"
            className="shrink-0 text-ink-3"
          >
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
            className="shrink-0 text-ink-3 hover:text-danger"
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
