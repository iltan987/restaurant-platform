"use client"

import { useQuery } from "@tanstack/react-query"
import { LayersIcon, MapPinIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { type Restaurant } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { EditableRow } from "@/components/editable-row"
import { InlineAdd } from "@/components/inline-add"
import { SuggestionChips } from "@/components/suggestion-chips"
import { floorsQueries } from "@/features/floors/queries"
import { StepHeader } from "@/features/restaurants/components/step-header"
import { tablesQueries } from "@/features/tables/queries"

import { areasQueries } from "../queries"
import { useCreateArea } from "../use-create-area"
import { useDeleteArea } from "../use-delete-area"
import { useUpdateArea } from "../use-update-area"

const AREA_SUGGESTIONS = [
  "Ana Salon",
  "Teras",
  "Bar",
  "Bahçe",
  "Özel Oda",
  "VIP Salon",
]

/** Optional short prefix for an area's table labels (e.g. "B" → B1, B2). */
function AreaCodeInput({
  code,
  onCommit,
}: {
  code: string | null
  onCommit: (code: string | null) => void
}) {
  const [value, setValue] = useState(code ?? "")

  function commit() {
    const next = value.trim().toUpperCase()
    setValue(next)
    if (next !== (code ?? "")) onCommit(next || null)
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          setValue(code ?? "")
          e.currentTarget.blur()
        }
      }}
      placeholder="Kod"
      aria-label="Bölge kodu (masa ön eki)"
      maxLength={5}
      className="w-14 shrink-0 rounded-md border bg-background px-2 py-1 text-center font-mono text-xs uppercase outline-none placeholder:font-sans placeholder:text-muted-foreground placeholder:normal-case focus:border-ring focus:ring-3 focus:ring-ring/30"
    />
  )
}

export function AreasStep({
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
  const create = useCreateArea(slug)
  const update = useUpdateArea(slug)
  const remove = useDeleteArea(slug)

  const isMulti = floors.length > 1

  const areasOf = (floorId: string) =>
    areas.filter((a) => a.floorId === floorId)
  const usedNames = areas.map((a) => a.name)

  const listFor = (floorId: string) => (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border bg-card">
        {areasOf(floorId).map((a) => {
          const areaTables = tables.filter((t) => t.areaId === a.id)
          const nonEmpty = areaTables.length > 0
          return (
            <EditableRow
              key={a.id}
              value={a.name}
              optimistic={a.id.startsWith("__optimistic__")}
              leading={
                <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
              }
              ariaLabel="Bölge adı"
              onCommit={(name) => update.mutate({ id: a.id, input: { name } })}
              trailing={
                <AreaCodeInput
                  code={a.code}
                  onCommit={(code) =>
                    update.mutate({ id: a.id, input: { code } })
                  }
                />
              }
              action={
                <ConfirmDialog
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${a.name} bölgesini sil`}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  }
                  title="Bölgeyi sil"
                  description={
                    nonEmpty
                      ? `"${a.name}" bölgesi ve içindeki ${areaTables.length} masa kalıcı olarak silinecek.`
                      : `"${a.name}" bölgesini silmek istediğinize emin misiniz?`
                  }
                  warning={
                    nonEmpty
                      ? `Bu ${areaTables.length} masanın QR kodları artık çalışmayacak; yeniden yazdırmanız gerekir.`
                      : undefined
                  }
                  requireAck={nonEmpty}
                  ackLabel="QR kodlarının çalışmayı durduracağını anlıyorum"
                  confirmLabel={nonEmpty ? "Kalıcı olarak sil" : "Sil"}
                  destructive
                  onConfirm={() =>
                    remove.mutate({ id: a.id, cascade: nonEmpty })
                  }
                />
              }
            />
          )
        })}
        <InlineAdd
          placeholder="Bölge ekle…"
          pending={create.isPending}
          onAdd={(name) => create.mutate({ floorId, input: { name } })}
        />
      </div>
      <SuggestionChips
        suggestions={AREA_SUGGESTIONS.filter((n) => !usedNames.includes(n))}
        onPick={(name) => create.mutate({ floorId, input: { name } })}
      />
    </div>
  )

  const body = isMulti ? (
    <div className="flex flex-col gap-6">
      {floors.map((f) => (
        <div key={f.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <LayersIcon className="size-4" />
            </span>
            <span className="text-[15px] font-semibold">{f.name}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {listFor(f.id)}
        </div>
      ))}
    </div>
  ) : floors[0] ? (
    listFor(floors[0].id)
  ) : null

  if (embedded) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Bölgeler</h2>
        {body}
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Adım 2 · Mekan"
        title="Bölgelerinizi ekleyin"
        lead={
          isMulti
            ? "Bölgeler masalarınızı gruplar — her katın kendi bölgeleri olur (Ana Salon, Teras, Bar gibi)."
            : "Bölgeler masalarınızı gruplar — Ana Salon, Teras, Bar gibi. İstediğiniz kadar ekleyin."
        }
      />
      {body}
      <p className="text-xs text-muted-foreground">
        İpucu: Bir bölgeye kısa bir kod verirseniz (örn.{" "}
        <span className="font-mono">B</span>), o bölgenin masaları{" "}
        <span className="font-mono">B1, B2…</span> şeklinde numaralanır. Boş
        bırakırsanız masalar kata göre sırayla numaralanır.
      </p>
    </div>
  )
}
