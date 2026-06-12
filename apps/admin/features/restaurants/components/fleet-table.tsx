"use client"

import { useRouter } from "next/navigation"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Spinner } from "@repo/ui/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table"
import { cn } from "@repo/ui/lib/utils"

import { StatusPill } from "@/components/console/status-pill"
import { rootDomain, TENANT_MODE, tenantDisplay } from "@/lib/domain"
import { isoDate } from "@/lib/format"

import { deriveStatus, isOptimistic } from "../lib/derive"
import { FleetRowMenu } from "./fleet-row-menu"
import { RestaurantLogo } from "./restaurant-logo"
import { SetupProgressMini } from "./setup-progress"

export function FleetTable({ items }: { items: RestaurantWithCounts[] }) {
  const router = useRouter()
  const root = rootDomain()

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Restoran</TableHead>
            <TableHead>Alan adı</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Kurulum</TableHead>
            <TableHead className="text-right">İçerik</TableHead>
            <TableHead>Son güncelleme</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => {
            const pending = isOptimistic(r)
            return (
              <TableRow
                key={r.id}
                className={cn(
                  "cursor-pointer",
                  pending && "pointer-events-none opacity-50"
                )}
                onClick={() => router.push(`/restoranlar/${r.slug}`)}
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <RestaurantLogo name={r.name} seed={r.slug} size="sm" />
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{r.name}</span>
                      {pending && (
                        <Spinner className="size-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {TENANT_MODE === "path" ? (
                      tenantDisplay(r.slug)
                    ) : (
                      <>
                        <span className="text-foreground">{r.slug}</span>.{root}
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill status={deriveStatus(r)} />
                </TableCell>
                <TableCell>
                  <SetupProgressMini r={r} />
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {r.tableCount} masa · {r.menuItemCount} menü
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {isoDate(r.updatedAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {!pending && <FleetRowMenu restaurant={r} />}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
