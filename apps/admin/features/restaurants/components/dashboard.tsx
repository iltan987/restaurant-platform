"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Banknote, Clock, Info, Rocket, Store } from "lucide-react"
import Link from "next/link"

import { Button } from "@repo/ui/components/ui/button"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

import { PageHeader } from "@/components/console/page-header"
import { StatTile } from "@/components/console/stat-tile"
import { ActivityFeed } from "@/features/activity/components/activity-feed"
import { activityQueries } from "@/features/activity/queries"

import { deriveStatus, fleetStats } from "../lib/derive"
import { restaurantsQueries } from "../queries"
import { CreateRestaurantDialog } from "./create-restaurant-dialog"
import { FleetCard } from "./fleet-card"
import { FleetTable } from "./fleet-table"

function SectionHeader({
  title,
  href,
  hrefLabel,
}: {
  title: string
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {href ? (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={href} />}
        >
          {hrefLabel}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

export function Dashboard() {
  const { data, isPending } = useQuery(restaurantsQueries.list())
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const stats = fleetStats(items)

  const needsSetup = items.filter((r) => deriveStatus(r) !== "live").slice(0, 6)
  const recent = items.slice(0, 4)

  return (
    <div>
      <PageHeader
        title="Genel Bakış"
        subtitle="Restoran filosunun kuş bakışı görünümü"
        actions={<CreateRestaurantDialog />}
      />

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={Store} value={total} label="Toplam restoran" />
          <StatTile
            icon={Rocket}
            tone="green"
            value={stats.live}
            label="Yayında"
            hint="aktif kiracı"
          />
          <StatTile
            icon={Clock}
            tone="amber"
            value={stats.setup + stats.draft}
            label="Kurulum bekliyor"
            hint={`${stats.draft} taslak · ${stats.setup} kurulumda`}
          />
          <StatTile
            icon={Banknote}
            tone="muted"
            value="—"
            label="Aylık yinelenen gelir"
            comingSoon
          />
        </div>
      )}

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <SectionHeader
            title="Dikkat gerektiren"
            href="/restoranlar"
            hrefLabel="Tüm filo"
          />
          {needsSetup.length > 0 ? (
            <FleetTable items={needsSetup} />
          ) : (
            <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              {isPending
                ? "Yükleniyor…"
                : "Kurulum bekleyen restoran yok — her şey yayında."}
            </div>
          )}

          {recent.length > 0 ? (
            <div className="mt-8">
              <SectionHeader title="Son eklenenler" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recent.map((r) => (
                  <FleetCard key={r.id} r={r} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <SectionHeader title="Etkinlik" href="/etkinlik" hrefLabel="Tümü" />
          <ActivityFeed
            query={activityQueries.global()}
            limit={6}
            emptyText="Henüz etkinlik yok."
          />

          <div className="mt-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Tüm uygulamalar kiracı durumunu doğrudan veritabanından okur.
              Yayına alma anında geçerli olur — ayrı bir dağıtım adımı yoktur.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
