"use client"

import { useQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { restaurantsQueries } from "../queries"
import { type DetailTab, DetailTabsBar } from "./detail/detail-tabs"
import { RestaurantHero } from "./detail/restaurant-hero"
import { TabDevir } from "./detail/tab-devir"
import { TabEtkinlik } from "./detail/tab-etkinlik"
import { TabKatPlani } from "./detail/tab-kat-plani"
import { TabMenu } from "./detail/tab-menu"
import { TabOzet } from "./detail/tab-ozet"
import { TabPlan } from "./detail/tab-plan"
import { TabProfil } from "./detail/tab-profil"
import { TabQr } from "./detail/tab-qr"

export function RestaurantDetail({ slug }: { slug: string }) {
  const { data: r } = useQuery(restaurantsQueries.detail(slug))
  const [tab, setTab] = useState<DetailTab>("ozet")

  if (!r) return null

  const badges: Partial<Record<DetailTab, number>> = {
    kat: r.areaCount,
    menu: r.menuItemCount,
    qr: r.tableCount,
  }

  return (
    <div>
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/restoranlar" className="hover:text-foreground">
          Restoranlar
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{r.name}</span>
      </nav>

      <RestaurantHero r={r} />

      <div className="mt-6">
        <DetailTabsBar value={tab} onValueChange={setTab} badges={badges} />

        {tab === "ozet" && <TabOzet r={r} onTab={setTab} />}
        {tab === "profil" && <TabProfil r={r} />}
        {tab === "kat" && <TabKatPlani slug={slug} restaurantId={r.id} />}
        {tab === "menu" && <TabMenu r={r} />}
        {tab === "qr" && <TabQr r={r} />}
        {tab === "plan" && <TabPlan />}
        {tab === "devir" && <TabDevir r={r} />}
        {tab === "etkinlik" && <TabEtkinlik r={r} />}
      </div>
    </div>
  )
}
