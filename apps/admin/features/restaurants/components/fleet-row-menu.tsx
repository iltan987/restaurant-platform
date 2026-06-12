"use client"

import {
  ArrowRight,
  ExternalLink,
  Globe,
  MoreHorizontal,
  PauseCircle,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { type Restaurant } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { tenantUrl } from "@/lib/domain"

import { useDeleteRestaurant } from "../use-delete-restaurant"
import { RestaurantEditDialog } from "./restaurant-edit-dialog"

/**
 * Per-row action menu for the fleet. Edit and delete dialogs are controlled and
 * rendered alongside the menu so they survive the menu closing on select.
 */
export function FleetRowMenu({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const del = useDeleteRestaurant()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const href = `/restoranlar/${restaurant.slug}`
  const menuUrl = tenantUrl(restaurant.slug)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${restaurant.name} — işlemler`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => router.push(href)}>
            <ArrowRight />
            Aç
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={menuUrl === "#"}
            onClick={() => window.open(menuUrl, "_blank", "noopener")}
          >
            <ExternalLink />
            Müşteri menüsünü gör
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Globe />
            Slug&apos;ı düzenle
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <PauseCircle />
            Askıya al · yakında
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RestaurantEditDialog
        restaurant={restaurant}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Restoranı sil"
        description={`"${restaurant.name}" kalıcı olarak silinecek.`}
        warning="Tüm katlar, alanlar ve masalar da silinir. QR kodları çalışmaz hale gelir. Bu işlem geri alınamaz."
        requireAck
        confirmLabel="Sil"
        destructive
        onConfirm={() => del.mutate(restaurant.id)}
      />
    </>
  )
}
