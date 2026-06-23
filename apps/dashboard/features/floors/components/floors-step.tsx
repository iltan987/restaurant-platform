"use client"

import { useQuery } from "@tanstack/react-query"
import { CheckIcon, LayersIcon, LayoutGridIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { type Restaurant } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { EditableRow } from "@/components/editable-row"
import { InlineAdd } from "@/components/inline-add"
import { SuggestionChips } from "@/components/suggestion-chips"
import { areasQueries } from "@/features/areas/queries"
import { StepHeader } from "@/features/restaurants/components/step-header"
import { tablesQueries } from "@/features/tables/queries"

import { floorsQueries } from "../queries"
import { useCreateFloor } from "../use-create-floor"
import { useDeleteFloor } from "../use-delete-floor"
import { useUpdateFloor } from "../use-update-floor"

const FLOOR_SUGGESTIONS = [
  "Zemin Kat",
  "Birinci Kat",
  "İkinci Kat",
  "Bodrum Kat",
  "Teras Katı",
]

function ChoiceCard({
  selected,
  disabled,
  icon,
  title,
  desc,
  onClick,
}: {
  selected: boolean
  disabled?: boolean
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col gap-2.5 rounded-card border-2 p-5 text-left transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-brand bg-brand-soft ring-2 ring-brand/15"
          : "border-line hover:border-line-strong hover:bg-surface-hover"
      )}
    >
      <span
        className={cn(
          "absolute top-4 right-4 grid size-5 place-items-center rounded-full border",
          selected
            ? "border-brand bg-brand text-white"
            : "border-line-strong text-transparent"
        )}
      >
        <CheckIcon className="size-3" />
      </span>
      <span
        className={cn(
          "grid size-10 place-items-center rounded-lg",
          selected ? "bg-surface text-brand" : "bg-surface-muted text-ink-3"
        )}
      >
        {icon}
      </span>
      <span className="text-[15px] font-semibold text-ink">{title}</span>
      <span className="text-xs leading-relaxed text-ink-3">{desc}</span>
    </button>
  )
}

export function FloorsStep({
  restaurant,
  embedded = false,
}: {
  restaurant: Restaurant
  embedded?: boolean
}) {
  const slug = restaurant.slug
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))
  const create = useCreateFloor(slug, restaurant.id)
  const update = useUpdateFloor(slug)
  const remove = useDeleteFloor(slug)

  const isMulti = floors.length > 1
  const [mode, setMode] = useState<"single" | "multi">(
    isMulti ? "multi" : "single"
  )
  const showList = mode === "multi" || isMulti

  const usedNames = floors.map((f) => f.name)
  // First unused suggestion — used to materialize a 2nd floor when the user
  // opts into multi-floor (otherwise "multi" with one floor is contradictory).
  const nextFloorName =
    FLOOR_SUGGESTIONS.find((n) => !usedNames.includes(n)) ?? "Yeni Kat"
  const isEmptyFloor = (floorId: string) =>
    !areas.some((a) => a.floorId === floorId)

  const chooseMulti = () => {
    setMode("multi")
    if (floors.length <= 1) create.mutate({ name: nextFloorName })
  }

  // Revert to single without forcing manual deletes: drop the extra floors the
  // user added but never filled (the home floor and any floor with areas stay).
  const chooseSingle = () => {
    setMode("single")
    floors.slice(1).forEach((f) => {
      if (isEmptyFloor(f.id)) remove.mutate({ id: f.id })
    })
  }

  const list = (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        {floors.map((f, i) => {
          const floorAreas = areas.filter((a) => a.floorId === f.id)
          const floorTables = tables.filter((t) =>
            floorAreas.some((a) => a.id === t.areaId)
          )
          const nonEmpty = floorAreas.length > 0
          const hasTables = floorTables.length > 0
          return (
            <EditableRow
              key={f.id}
              value={f.name}
              optimistic={f.id.startsWith("__optimistic__")}
              leading={
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft font-mono text-xs font-semibold text-brand">
                  {i + 1}
                </span>
              }
              ariaLabel="Kat adı"
              onCommit={(name) => update.mutate({ id: f.id, input: { name } })}
              action={
                i === 0 ? (
                  <span className="shrink-0 px-2 text-[11px] font-medium text-ink-3">
                    Ana kat
                  </span>
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${f.name} katını sil`}
                      >
                        <Trash2Icon className="size-4 text-danger" />
                      </Button>
                    }
                    title="Katı sil"
                    description={
                      nonEmpty
                        ? `"${f.name}" katı ve içindeki ${floorAreas.length} bölge${hasTables ? ` ile ${floorTables.length} masa` : ""} kalıcı olarak silinecek.`
                        : `"${f.name}" katını silmek istediğinize emin misiniz?`
                    }
                    warning={
                      hasTables
                        ? `Bu ${floorTables.length} masanın QR kodları artık çalışmayacak; yeniden yazdırmanız gerekir.`
                        : undefined
                    }
                    requireAck={hasTables}
                    ackLabel="QR kodlarının çalışmayı durduracağını anlıyorum"
                    confirmLabel={nonEmpty ? "Kalıcı olarak sil" : "Sil"}
                    destructive
                    onConfirm={() =>
                      remove.mutate({ id: f.id, cascade: nonEmpty })
                    }
                  />
                )
              }
            />
          )
        })}
        <InlineAdd
          placeholder="Kat ekle…"
          pending={create.isPending}
          onAdd={(name) => create.mutate({ name })}
        />
      </div>
      <SuggestionChips
        suggestions={FLOOR_SUGGESTIONS.filter((n) => !usedNames.includes(n))}
        onPick={(name) => create.mutate({ name })}
      />
    </div>
  )

  if (embedded) {
    // Management surface: only relevant once there are multiple floors.
    if (!isMulti) return null
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-ink">Katlar</h2>
        {list}
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Adım 1 · Yapı"
        title="Kaç katınız var?"
        lead="Tek katlı bir mekânsanız katları hiç düşünmenize gerek yok — doğrudan alanlarınızı ekleyin. Birden fazla katınız varsa alanlarınızı katlara göre düzenleyebilirsiniz."
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <ChoiceCard
          selected={!showList}
          icon={<LayoutGridIcon className="size-5" />}
          title="Tek kat"
          desc="En basit kurulum. Kat seçici hiç görünmez — doğrudan alanlarınızı yönetirsiniz."
          onClick={chooseSingle}
        />
        <ChoiceCard
          selected={showList}
          icon={<LayersIcon className="size-5" />}
          title="Birden fazla kat"
          desc="Zemin, birinci kat, teras… Her kat kendi alanlarını barındırır."
          onClick={chooseMulti}
        />
      </div>

      {showList && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">Katlarınız</p>
          {list}
        </div>
      )}
    </div>
  )
}
