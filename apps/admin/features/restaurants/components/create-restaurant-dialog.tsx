"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Check,
  Info,
  Lock,
  Mail,
  Plus,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ReactElement, useEffect, useState } from "react"

import { ApiError } from "@repo/api-client"
import { slugify } from "@repo/core"
import { ErrorCode } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { ComingSoonBadge } from "@/components/console/scaffold-panel"
import { rootDomain, TENANT_MODE, tenantDisplay } from "@/lib/domain"

import { restaurantsQueries } from "../queries"
import { useCreateRestaurant } from "../use-create-restaurant"

type Availability = "idle" | "checking" | "ok" | "taken"

/**
 * Create a restaurant. The name live-generates a slug and reserves
 * `<slug>.<root>`; an availability check (debounced) confirms it's free before
 * enabling create. The slug can be overridden or reverted to auto. Template /
 * owner are shown disabled — prepared for a later phase.
 */
export function CreateRestaurantDialog({
  trigger,
}: {
  trigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  // null → auto-derive from the name; a string → user override.
  const [override, setOverride] = useState<string | null>(null)
  const [debounced, setDebounced] = useState("")
  const create = useCreateRestaurant()
  const root = rootDomain()

  const slug = override ?? slugify(name)
  const custom = override !== null

  // Debounce the slug before hitting the availability endpoint.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(slug), 400)
    return () => clearTimeout(id)
  }, [slug])

  const { data, isFetching } = useQuery({
    ...restaurantsQueries.slugAvailable(debounced),
    enabled: open && debounced.length > 0,
  })

  let availability: Availability = "idle"
  if (slug) {
    if (isFetching || debounced !== slug) availability = "checking"
    else if (data?.available) availability = "ok"
    else if (data) availability = "taken"
    else availability = "checking"
  }

  const canCreate =
    name.trim().length > 0 && slug.length > 0 && availability === "ok"

  function reset() {
    setName("")
    setOverride(null)
    setDebounced("")
    create.reset()
  }

  function change(next: boolean) {
    setOpen(next)
    if (next) reset()
  }

  function submit() {
    if (!canCreate) return
    create.mutate(
      { name: name.trim(), slug },
      {
        onSuccess: () => setOpen(false),
        onError: (err) => {
          if (err instanceof ApiError && err.code === ErrorCode.SLUG_TAKEN) {
            setOverride(slug)
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus className="size-4" />
              Yeni restoran
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni restoran</DialogTitle>
          <DialogDescription>
            Sistem ad&apos;dan bir slug üretir ve alt alan adını ayırır.
            İstersen değiştirebilirsin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-name">
              Restoran adı <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-name"
              value={name}
              autoFocus
              autoComplete="off"
              maxLength={120}
              placeholder="örn. Boğaziçi Lokantası"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Slug + availability */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="create-slug">Alan adı</Label>
              {custom ? (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  Otomatiğe dön
                </button>
              ) : null}
            </div>
            <div className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <input
                id="create-slug"
                value={slug}
                autoComplete="off"
                placeholder="restoran-adi"
                onChange={(e) => setOverride(slugify(e.target.value))}
                className={cn(
                  "min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none",
                  TENANT_MODE === "path" ? "text-left" : "text-right"
                )}
              />
              {TENANT_MODE !== "path" && (
                <span className="shrink-0 font-mono text-sm text-muted-foreground">
                  .{root}
                </span>
              )}
              <span className="grid h-full w-10 place-items-center border-l border-border">
                {availability === "checking" ? (
                  <Spinner className="size-3.5" />
                ) : availability === "ok" ? (
                  <Check className="size-4 text-emerald-500" />
                ) : availability === "taken" ? (
                  <X className="size-4 text-destructive" />
                ) : null}
              </span>
            </div>
            <p
              className={cn(
                "inline-flex items-center gap-1.5 text-xs",
                availability === "ok" &&
                  "text-emerald-600 dark:text-emerald-400",
                availability === "taken" && "text-destructive",
                (availability === "idle" || availability === "checking") &&
                  "text-muted-foreground"
              )}
            >
              {availability === "ok" ? (
                <>
                  <Check className="size-3" />
                  <span className="font-mono">
                    {TENANT_MODE === "path"
                      ? tenantDisplay(slug)
                      : `${slug}.${root}`}
                  </span>{" "}
                  müsait
                </>
              ) : availability === "taken" ? (
                <>
                  <TriangleAlert className="size-3" />
                  Bu slug kullanımda — başka bir tane dene
                </>
              ) : availability === "checking" ? (
                "Uygunluk kontrol ediliyor…"
              ) : (
                "Önce bir ad gir"
              )}
            </p>
          </div>

          {/* Scaffolded fields — prepared for a later phase */}
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Şablon, plan ve sahip daveti
              </span>
              <ComingSoonBadge />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm text-muted-foreground/60">
                Başlangıç şablonu
              </div>
              <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground/60">
                <Mail className="size-3.5" />
                Sahip e-postası
              </div>
            </div>
          </div>

          {/* Summary */}
          {canCreate ? (
            <div className="flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-[13px] leading-relaxed">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <b>{name.trim()}</b> oluşturulacak;{" "}
                <span className="font-mono">
                  {TENANT_MODE === "path"
                    ? tenantDisplay(slug)
                    : `${slug}.${root}`}
                </span>{" "}
                ayrılır. Varsayılan bir kat ve alan ile başlar. Durum:{" "}
                <b>Taslak</b>.
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            <span className="font-mono">
              {slug || "slug"}.{root}
            </span>{" "}
            ayrılacak
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button onClick={submit} disabled={!canCreate || create.isPending}>
              {create.isPending ? (
                <>
                  <Spinner className="size-3.5" />
                  Oluşturuluyor…
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Oluştur
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
