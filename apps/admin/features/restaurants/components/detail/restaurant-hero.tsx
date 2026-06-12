"use client"

import {
  Copy,
  ExternalLink,
  Globe,
  MoreHorizontal,
  PowerOff,
  Rocket,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { type RestaurantWithCounts } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatusPill } from "@/components/console/status-pill"
import { rootDomain, TENANT_MODE, tenantDisplay, tenantUrl } from "@/lib/domain"

import { deriveStatus } from "../../lib/derive"
import { useDeleteRestaurant } from "../../use-delete-restaurant"
import { useSetRestaurantStatus } from "../../use-set-restaurant-status"
import { RestaurantEditDialog } from "../restaurant-edit-dialog"
import { RestaurantLogo } from "../restaurant-logo"

export function RestaurantHero({ r }: { r: RestaurantWithCounts }) {
  const router = useRouter()
  const setStatus = useSetRestaurantStatus()
  const del = useDeleteRestaurant()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const root = rootDomain()
  const url = tenantUrl(r.slug)
  const isLive = r.status === "ACTIVE"

  function copySlug() {
    navigator.clipboard
      ?.writeText(tenantDisplay(r.slug))
      .then(() => toast.success("Alan adı kopyalandı."))
      .catch(() => {})
  }

  return (
    <div className="flex items-start gap-4">
      <RestaurantLogo name={r.name} seed={r.slug} size="lg" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{r.name}</h1>
          <StatusPill status={deriveStatus(r)} />
        </div>

        <div className="mt-3 flex items-center gap-1 rounded-md border border-border bg-card py-1 pr-1 pl-3 text-sm shadow-xs">
          <Globe className="size-3.5 text-muted-foreground" />
          <span className="ml-1.5 font-mono">
            {TENANT_MODE === "path" ? (
              tenantDisplay(r.slug)
            ) : (
              <>
                {r.slug}
                <span className="text-muted-foreground">.{root}</span>
              </>
            )}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-1.5"
            aria-label="Alan adını kopyala"
            onClick={copySlug}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Müşteri menüsünü aç"
            disabled={url === "#"}
            nativeButton={false}
            render={
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isLive ? (
          <Button
            variant="outline"
            disabled={url === "#"}
            nativeButton={false}
            render={
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Menüyü gör
              </a>
            }
          />
        ) : (
          <Button
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: r.id, status: "ACTIVE" })}
          >
            <Rocket className="size-4" />
            Yayına al
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Daha fazla">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Globe />
              Slug / alan adını düzenle
            </DropdownMenuItem>
            {isLive ? (
              <DropdownMenuItem
                onClick={() =>
                  setStatus.mutate({ id: r.id, status: "INACTIVE" })
                }
              >
                <PowerOff />
                Yayından kaldır
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
              Restoranı sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RestaurantEditDialog
        restaurant={r}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Restoranı sil"
        description={`"${r.name}" kalıcı olarak silinecek.`}
        warning="Tüm katlar, alanlar ve masalar da silinir. QR kodları çalışmaz hale gelir. Bu işlem geri alınamaz."
        requireAck
        confirmLabel="Sil"
        destructive
        onConfirm={() => {
          del.mutate(r.id)
          router.push("/restoranlar")
        }}
      />
    </div>
  )
}
