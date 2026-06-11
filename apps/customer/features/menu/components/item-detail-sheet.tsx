"use client"

import {
  CameraIcon,
  ClockIcon,
  InfoIcon,
  PlayIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useRef, useState } from "react"

import { type MenuTreeItem } from "@repo/schemas"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"
import { Separator } from "@repo/ui/components/ui/separator"
import { cn } from "@repo/ui/lib/utils"

import {
  formatTRY,
  type ItemState,
  itemState,
  servingLabel,
  unitPriceLabel,
  windowText,
} from "../format"
import { TagChip } from "./item-card"

// Single near-full height — just a sliver of the page shows above it. No snap
// points: Vaul's plain drag-to-dismiss closes cleanly from anywhere (a
// multi-detent sheet has to collapse to the lower detent before closing, which
// looks like a teleport). Tall items scroll inside.
const SHEET_HEIGHT = "h-[96dvh]"

/* ---------- media carousel ---------- */
function Gallery({ item }: { item: MenuTreeItem }) {
  const [idx, setIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const media = item.media

  if (media.length === 0) {
    return (
      <div className="grid aspect-[16/10] place-items-center bg-[var(--accent-softer)]">
        <span className="font-display text-[64px] font-medium text-[var(--accent-text)]/70">
          {item.name.trim().charAt(0)}
        </span>
      </div>
    )
  }

  const onScroll = () => {
    const el = trackRef.current
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }
  const current = media[idx]

  return (
    <div className="relative bg-muted">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="menu-scroll flex aspect-[16/11] snap-x snap-mandatory overflow-x-auto"
      >
        {media.map((m) =>
          m.type === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.id}
              src={m.url}
              alt=""
              className="size-full shrink-0 basis-full snap-center snap-always object-cover"
            />
          ) : (
            <video
              key={m.id}
              src={m.url}
              controls
              playsInline
              className="size-full shrink-0 basis-full snap-center snap-always bg-black object-contain"
            />
          )
        )}
      </div>

      <span className="absolute top-3 left-3 z-[2] flex items-center gap-1.5 rounded-full bg-[oklch(0.2_0.02_50/0.5)] px-2.5 py-[3px] font-mono text-[11px] font-semibold text-white backdrop-blur-[3px]">
        {current?.type === "VIDEO" ? (
          <PlayIcon className="size-3" />
        ) : (
          <CameraIcon className="size-3" />
        )}
        {idx + 1}/{media.length}
      </span>

      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5">
          {media.map((m, i) => (
            <span
              key={m.id}
              className={cn(
                "h-[7px] rounded-full transition-all",
                i === idx ? "w-5 bg-white" : "w-[7px] bg-white/55"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- availability callout ---------- */
function AvailabilityCallout({
  item,
  state,
}: {
  item: MenuTreeItem
  state: ItemState
}) {
  const windows = item.availabilityWindows
  if (state === "sold-out") {
    return (
      <Callout tone="off" icon={<TriangleAlertIcon className="size-[18px]" />}>
        <div className="text-[13.5px] font-semibold">Tükendi</div>
        <div className="mt-px text-[12.5px] opacity-90">
          Bu ürün şu anda mevcut değil.
        </div>
      </Callout>
    )
  }
  if (state === "off-hours") {
    return (
      <Callout tone="off" icon={<ClockIcon className="size-[18px]" />}>
        <div className="text-[13.5px] font-semibold">
          Şu an servis edilmiyor
        </div>
        {windows.map((w) => (
          <div key={w.id} className="mt-px text-[12.5px] opacity-90">
            {windowText(w)}
          </div>
        ))}
      </Callout>
    )
  }
  if (windows.length > 0) {
    return (
      <Callout tone="now" icon={<ClockIcon className="size-[18px]" />}>
        <div className="text-[13.5px] font-semibold">Şimdi servis ediliyor</div>
        {windows.map((w) => (
          <div key={w.id} className="mt-px text-[12.5px] opacity-90">
            {windowText(w)}
          </div>
        ))}
      </Callout>
    )
  }
  return null
}

function Callout({
  tone,
  icon,
  children,
}: {
  tone: "now" | "off"
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-5 mt-4 flex items-start gap-2.5 rounded-[var(--radius)] border p-3",
        tone === "now"
          ? "border-[oklch(0.87_0.07_152)] bg-[var(--green-soft)] text-[var(--green-text)]"
          : "border-[oklch(0.88_0.06_30)] bg-[var(--red-soft)] text-[var(--red-text)]"
      )}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  )
}

/* ---------- read-only option groups (informative) ---------- */
function ReadOnlyOptions({ item }: { item: MenuTreeItem }) {
  if (item.optionGroups.length === 0) return null
  return (
    <>
      {item.optionGroups.map((g) => (
        <div key={g.id} className="mt-5 px-5">
          <div className="mb-2.5 text-xs font-bold tracking-[0.06em] text-[var(--text-faint)] uppercase">
            {g.name}
          </div>
          <div className="flex flex-col gap-0.5">
            {g.options.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "flex items-baseline gap-2 py-1.5 text-sm text-secondary-foreground",
                  !o.isAvailable && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "text-foreground",
                    !o.isAvailable && "text-[var(--text-faint)] line-through"
                  )}
                >
                  {o.name}
                </span>
                {o.priceDeltaMinor > 0 ? (
                  <span className="ml-auto font-mono text-[13px] text-muted-foreground">
                    +{formatTRY(o.priceDeltaMinor)}
                  </span>
                ) : o.defaultSelected ? (
                  <span className="ml-auto text-[11.5px] text-[var(--text-faint)]">
                    dahil
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/* ---------- meta tiles (calories / serving) ---------- */
function MetaStrip({ item }: { item: MenuTreeItem }) {
  const serving = servingLabel(item)
  const unit = unitPriceLabel(item)
  if (item.calories == null && !serving) return null
  return (
    <div className="mt-4 flex gap-2.5">
      {item.calories != null && (
        <div className="flex-1 rounded-[var(--radius)] border border-border/60 bg-secondary px-3.5 py-2.5">
          <div className="font-mono text-base font-semibold">
            {item.calories}{" "}
            <span className="text-[11px] font-medium text-muted-foreground">
              kcal
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Kalori</div>
        </div>
      )}
      {serving && (
        <div className="flex-1 rounded-[var(--radius)] border border-border/60 bg-secondary px-3.5 py-2.5">
          <div className="font-mono text-base font-semibold">{serving}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {unit ?? "Porsiyon"}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Item detail as a mobile bottom sheet (read-only / informative — ordering is a
 * later slice). Built on the shared Vaul-based Drawer: a single near-full
 * resting height, drag down to dismiss, scroll inside for tall items. Escape,
 * scrim-tap and the X button close it; the page behind is scroll-locked. Kept
 * mounted by the parent (open is controlled) so Vaul runs its own close cleanup.
 */
export function ItemDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: MenuTreeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        showHandle={false}
        overlayClassName="bg-[oklch(0.26_0.03_55/0.46)] backdrop-blur-[3px]"
        className={cn(
          SHEET_HEIGHT,
          "menu-scope overflow-hidden bg-card shadow-[0_-10px_40px_oklch(0.26_0.03_55/0.18)] outline-none data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-0"
        )}
      >
        {item && <SheetBody item={item} onClose={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  )
}

/**
 * The sheet's content — split out so it only mounts when there's an item (the
 * Drawer shell stays mounted even while closed).
 */
function SheetBody({
  item,
  onClose,
}: {
  item: MenuTreeItem
  onClose: () => void
}) {
  const state = itemState(item)
  const unit = unitPriceLabel(item)
  const serving = servingLabel(item)
  const footNote =
    state === "sold-out"
      ? "Bu ürün şu an tükendi."
      : state === "off-hours"
        ? "Bu ürün şu an servis dışı."
        : "Görüntüleme menüsü — sipariş özelliği yakında eklenecek."

  return (
    <>
      {/* Decorative grabber — the whole sheet is draggable (Vaul default). */}
      <span className="absolute top-2.5 left-1/2 z-[3] h-[5px] w-[38px] -translate-x-1/2 rounded-full bg-white/70" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute top-3 right-3 z-[3] grid size-[34px] place-items-center rounded-full bg-white/85 text-foreground shadow-sm backdrop-blur-[4px]"
      >
        <XIcon className="size-[18px]" />
      </button>

      {/* Vaul only drags when this is scrolled to top, so scroll and
          drag-to-dismiss coexist without fighting. */}
      <div className="menu-scroll flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <Gallery item={item} />

        <div className="px-5 pt-4.5 pb-4">
          <DrawerTitle
            asChild
            className="font-display text-[27px] leading-[1.08] font-medium tracking-[-0.015em] text-foreground"
          >
            <h2>{item.name}</h2>
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {item.description ?? "Ürün detayları"}
          </DrawerDescription>
          <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
            <span className="font-mono text-[22px] font-semibold tracking-tight">
              {formatTRY(item.priceMinor)}
            </span>
            {unit && (
              <span className="font-mono text-[13px] text-muted-foreground">
                · {unit}
              </span>
            )}
            {serving && (
              <span className="font-mono text-[13px] text-muted-foreground">
                · {serving}
              </span>
            )}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <TagChip key={t.id} label={t.label} />
              ))}
            </div>
          )}
          {item.description && (
            <p className="mt-3.5 text-[15px] leading-relaxed text-pretty text-secondary-foreground">
              {item.description}
            </p>
          )}
          <MetaStrip item={item} />
        </div>

        <AvailabilityCallout item={item} state={state} />

        {item.allergens.length > 0 && (
          <div className="mt-5 px-5">
            <div className="mb-2.5 text-xs font-bold tracking-[0.06em] text-[var(--text-faint)] uppercase">
              Alerjenler
            </div>
            <div className="flex flex-wrap gap-2">
              {item.allergens.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[oklch(0.87_0.08_72)] bg-[var(--amber-soft)] px-[11px] text-[12.5px] font-medium text-[var(--amber-text)]"
                >
                  <TriangleAlertIcon className="size-3.5" />
                  {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.optionGroups.length > 0 && (
          <>
            <Separator className="mx-5 my-5 w-auto bg-border/60" />
            <ReadOnlyOptions item={item} />
          </>
        )}

        <div className="h-[90px]" />
      </div>

      <div className="shrink-0 border-t border-border/60 bg-card px-[18px] py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted-foreground">
            {state === "available" ? (
              <InfoIcon className="size-4" />
            ) : (
              <ClockIcon className="size-4" />
            )}
          </span>
          <span className="text-[12.5px] leading-snug text-muted-foreground">
            {footNote}
          </span>
        </div>
      </div>
    </>
  )
}
