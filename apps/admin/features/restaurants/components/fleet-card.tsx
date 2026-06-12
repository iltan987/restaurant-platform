"use client"

import Link from "next/link"

import { type RestaurantWithCounts } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

import { StatusPill } from "@/components/console/status-pill"
import { rootDomain, TENANT_MODE, tenantDisplay } from "@/lib/domain"

import { deriveStatus, isOptimistic } from "../lib/derive"
import { RestaurantLogo } from "./restaurant-logo"
import { SetupProgressMini } from "./setup-progress"

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[15px] font-semibold tabular-nums">
        {n}
      </span>
      <span className="text-[10.5px] tracking-wide text-muted-foreground/70 uppercase">
        {label}
      </span>
    </div>
  )
}

export function FleetCard({ r }: { r: RestaurantWithCounts }) {
  const pending = isOptimistic(r)
  const root = rootDomain()

  return (
    <Link
      href={pending ? "#" : `/restoranlar/${r.slug}`}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md",
        pending && "pointer-events-none opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        <RestaurantLogo name={r.name} seed={r.slug} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{r.name}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {TENANT_MODE === "path" ? (
              tenantDisplay(r.slug)
            ) : (
              <>
                <span className="text-foreground/80">{r.slug}</span>.{root}
              </>
            )}
          </div>
        </div>
        <StatusPill status={deriveStatus(r)} />
      </div>

      <div className="flex gap-5">
        <Stat n={r.tableCount} label="Masa" />
        <Stat n={r.areaCount} label="Alan" />
        <Stat n={r.menuItemCount} label="Menü" />
      </div>

      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-xs text-muted-foreground">Kurulum</span>
        <SetupProgressMini r={r} />
      </div>
    </Link>
  )
}
