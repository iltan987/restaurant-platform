"use client"

import {
  ExternalLinkIcon,
  PencilIcon,
  PowerIcon,
  PowerOffIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"

import { type Restaurant } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Card, CardContent } from "@repo/ui/components/ui/card"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { ConfirmDialog } from "@/components/confirm-dialog"

import { useDeleteRestaurant } from "../use-delete-restaurant"
import { useSetRestaurantStatus } from "../use-set-restaurant-status"
import { RestaurantEditDialog } from "./restaurant-edit-dialog"

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL

function tenantUrl(slug: string): string {
  if (!DASHBOARD_URL) return "#"
  const url = new URL(DASHBOARD_URL)
  url.hostname = `${slug}.${url.hostname}`
  return url.toString().replace(/\/$/, "")
}

export function isOptimistic(r: Restaurant) {
  return r.id.startsWith("__optimistic__")
}

export function RestaurantRow({ restaurant }: { restaurant: Restaurant }) {
  const pending = isOptimistic(restaurant)
  const isActive = restaurant.status === "ACTIVE"
  const setStatus = useSetRestaurantStatus()
  const del = useDeleteRestaurant()

  return (
    <Card
      size="sm"
      className={`gap-0 transition-opacity duration-300 ${pending ? "opacity-50" : "opacity-100"}`}
    >
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {restaurant.name}
            </span>
            {pending && <Spinner className="size-3 text-muted-foreground" />}
          </div>
          <code className="truncate text-xs text-muted-foreground">
            {restaurant.slug}
          </code>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant={isActive ? "default" : "outline"}
            className={
              isActive
                ? "mr-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "mr-1"
            }
          >
            {isActive ? "Aktif" : "Pasif"}
          </Badge>

          {!pending && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                aria-label={`${restaurant.name} — yönet`}
                render={<Link href={`/${restaurant.slug}`} />}
              >
                <SlidersHorizontalIcon className="size-3.5" />
              </Button>

              <RestaurantEditDialog
                restaurant={restaurant}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${restaurant.name} — düzenle`}
                  >
                    <PencilIcon className="size-3.5" />
                  </Button>
                }
              />

              <Button
                variant="ghost"
                size="icon-sm"
                disabled={setStatus.isPending}
                aria-label={isActive ? "Yayından kaldır" : "Yayına al"}
                onClick={() =>
                  setStatus.mutate({
                    id: restaurant.id,
                    status: isActive ? "INACTIVE" : "ACTIVE",
                  })
                }
              >
                {isActive ? (
                  <PowerOffIcon className="size-3.5" />
                ) : (
                  <PowerIcon className="size-3.5" />
                )}
              </Button>

              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`${restaurant.name} — sil`}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                }
                title="Restoranı sil"
                description={`"${restaurant.name}" kalıcı olarak silinecek.`}
                warning="Tüm katlar, bölgeler ve masalar da silinir. QR kodları çalışmaz hale gelir. Bu işlem geri alınamaz."
                requireAck
                confirmLabel="Sil"
                destructive
                onConfirm={() => del.mutate(restaurant.id)}
              />

              <a
                href={tenantUrl(restaurant.slug)}
                target="_blank"
                rel="noreferrer"
                className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`${restaurant.name} — yeni sekmede aç`}
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
