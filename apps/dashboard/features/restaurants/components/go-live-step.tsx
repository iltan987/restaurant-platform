"use client"

import { useQuery } from "@tanstack/react-query"

import { type Restaurant } from "@repo/schemas"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { tablesQueries } from "@/features/tables/queries"

import { GoLiveControls } from "./go-live-controls"
import { StepHeader } from "./step-header"

export function GoLiveStep({ restaurant }: { restaurant: Restaurant }) {
  const slug = restaurant.slug
  const { data: floors = [] } = useQuery(floorsQueries.bySlug(slug))
  const { data: areas = [] } = useQuery(areasQueries.bySlug(slug))
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))

  const isMulti = floors.length > 1
  const totalSeats = tables.reduce((s, t) => s + (t.capacity ?? 0), 0)

  const tiles = [
    ...(isMulti ? [{ n: floors.length, l: "Kat" }] : []),
    { n: areas.length, l: "Bölge" },
    { n: tables.length, l: "Masa" },
    { n: totalSeats, l: "Koltuk" },
  ]

  return (
    <div className="flex flex-col gap-7">
      <StepHeader
        eyebrow="Son adım · Yayına Al"
        title="Yayına almaya hazır mısınız?"
        lead="Yayına aldığınızda müşteriler QR kodlarını okutup menünüzü görebilir. Dilerseniz kuruluma daha sonra da devam edebilirsiniz."
      />

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.l}
            className="rounded-card border border-line bg-surface-subtle p-4 text-center"
          >
            <div className="font-mono text-2xl font-bold tracking-tight text-ink">
              {t.n}
            </div>
            <div className="mt-0.5 text-xs text-ink-3">{t.l}</div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
        <GoLiveControls restaurant={restaurant} tableCount={tables.length} />
      </div>
    </div>
  )
}
