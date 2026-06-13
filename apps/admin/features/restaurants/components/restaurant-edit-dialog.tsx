"use client"

import { TriangleAlertIcon } from "lucide-react"
import { type ReactElement, useState } from "react"

import { slugify } from "@repo/core"
import { type Restaurant } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"

import { rootDomain } from "@/lib/domain"

import { useUpdateRestaurant } from "../use-update-restaurant"

/**
 * Admin edit of a restaurant's name + slug. A slug change on a **live**
 * restaurant breaks existing QR codes and subdomain links, so we warn before
 * saving (FR-008). The slug is normalized so what we send always validates.
 */
export function RestaurantEditDialog({
  restaurant,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  restaurant: Restaurant
  /** Omit to drive the dialog via `open` / `onOpenChange` (e.g. from a menu). */
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const update = useUpdateRestaurant()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const [name, setName] = useState(restaurant.name)
  const [slug, setSlug] = useState(restaurant.slug)

  const normalized = slugify(slug)
  const slugChanged = normalized !== "" && normalized !== restaurant.slug
  const warnLiveSlug = restaurant.status === "ACTIVE" && slugChanged

  function change(next: boolean) {
    onOpenChange?.(next)
    setUncontrolledOpen(next)
    if (next) {
      setName(restaurant.name)
      setSlug(restaurant.slug)
    }
  }

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    update.mutate({
      id: restaurant.id,
      input: {
        ...(trimmedName !== restaurant.name ? { name: trimmedName } : {}),
        ...(slugChanged ? { slug: normalized } : {}),
      },
    })
    change(false)
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restoranı düzenle</DialogTitle>
          <DialogDescription>
            Ad ve kısa adı (slug) güncelleyin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="restaurant-name">Ad</Label>
          <Input
            id="restaurant-name"
            value={name}
            autoFocus
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="restaurant-slug">Kısa ad</Label>
          <Input
            id="restaurant-slug"
            value={slug}
            className="font-mono"
            autoComplete="off"
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            URL: <code>{`${normalized || "<kısa-ad>"}.${rootDomain()}`}</code>
          </p>
        </div>

        {warnLiveSlug && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            <TriangleAlertIcon className="mt-px size-4 shrink-0" />
            <div>
              Bu restoran yayında. Kısa adı değiştirmek mevcut QR kodlarını ve
              bağlantıları çalışmaz hale getirir.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" />}>İptal</DialogClose>
          <Button onClick={save} disabled={!name.trim()}>
            Kaydet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
