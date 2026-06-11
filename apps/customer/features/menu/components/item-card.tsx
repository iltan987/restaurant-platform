import {
  CameraIcon,
  ClockIcon,
  FlameIcon,
  LeafIcon,
  PlayIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react"
import { type ReactNode } from "react"

import { type MenuTreeItem } from "@repo/schemas"
import { cn } from "@repo/ui/lib/utils"

import {
  formatTRY,
  type ItemState,
  itemState,
  type TagVariant,
  tagVariant,
  unitPriceLabel,
} from "../format"

const TAG_VARIANT_CLASS: Record<TagVariant, string> = {
  veg: "border-[oklch(0.86_0.07_152)] bg-[var(--green-soft)] text-[var(--green-text)]",
  spicy:
    "border-[oklch(0.87_0.06_30)] bg-[var(--red-soft)] text-[var(--red-text)]",
  chef: "border-[oklch(0.87_0.06_55)] bg-[var(--accent-soft)] text-[var(--accent-text)]",
  default: "border-border bg-muted text-secondary-foreground",
}

function TagIcon({ variant }: { variant: TagVariant }) {
  if (variant === "veg") return <LeafIcon className="size-3" />
  if (variant === "spicy") return <FlameIcon className="size-3" />
  if (variant === "chef") return <SparklesIcon className="size-3" />
  return null
}

export function TagChip({ label }: { label: string }) {
  const variant = tagVariant(label)
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full border px-[9px] text-[11.5px] font-semibold tracking-wide",
        TAG_VARIANT_CLASS[variant]
      )}
    >
      <TagIcon variant={variant} />
      {label}
    </span>
  )
}

/** Cover thumbnail: photo, video frame, or a branded monogram fallback. */
export function Thumbnail({
  item,
  state,
  className,
}: {
  item: MenuTreeItem
  state: ItemState
  className?: string
}) {
  const cover = item.media[0]
  const dimmed = state !== "available"
  return (
    <div
      aria-hidden
      className={cn(
        "relative size-23 shrink-0 overflow-hidden rounded-[var(--radius)] bg-muted",
        className
      )}
    >
      {cover ? (
        <>
          {cover.type === "PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt=""
              className={cn(
                "size-full object-cover",
                dimmed && "brightness-[1.02] grayscale-[0.85]"
              )}
            />
          ) : (
            <video
              src={cover.url}
              muted
              playsInline
              preload="metadata"
              className={cn(
                "size-full object-cover",
                dimmed && "brightness-[1.02] grayscale-[0.85]"
              )}
            />
          )}
          <span className="absolute right-1.5 bottom-1.5 grid size-5 place-items-center rounded-md bg-white/80 text-secondary-foreground backdrop-blur-[2px]">
            {cover.type === "PHOTO" ? (
              <CameraIcon className="size-3" />
            ) : (
              <PlayIcon className="size-3" />
            )}
          </span>
        </>
      ) : (
        <div
          className={cn(
            "grid size-full place-items-center bg-[var(--accent-softer)]",
            dimmed && "brightness-[1.02] grayscale-[0.85]"
          )}
        >
          <span className="font-display text-3xl font-medium text-[var(--accent-text)]/85">
            {item.name.trim().charAt(0)}
          </span>
          <UtensilsCrossedIcon className="absolute right-[7px] bottom-1.5 size-3 text-primary/55" />
        </div>
      )}
    </div>
  )
}

function UnavailTag({ state }: { state: ItemState }) {
  if (state === "sold-out") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.86_0.07_30)] bg-[var(--red-soft)] px-[9px] py-[3px] text-xs font-semibold text-[var(--red-text)]">
        <XIcon className="size-3" /> Tükendi
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.86_0.09_72)] bg-[var(--amber-soft)] px-[9px] py-[3px] text-xs font-semibold text-[var(--amber-text)]">
      <ClockIcon className="size-3" /> Şu an servis dışı
    </span>
  )
}

function Price({ item }: { item: MenuTreeItem }) {
  const unit = unitPriceLabel(item)
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[15px] font-semibold tracking-tight">
        {formatTRY(item.priceMinor)}
      </span>
      {unit && (
        <span className="font-mono text-[11.5px] text-muted-foreground">
          · {unit}
        </span>
      )}
    </div>
  )
}

/**
 * A single menu item row — name, description, tags, and a foot that shows
 * either the price (+ unit price + kcal) or an unavailable badge. Tapping opens
 * the detail sheet. Unavailable items stay listed but dimmed (FR-029).
 */
export function ItemCard({
  item,
  onOpen,
  nameSlot,
}: {
  item: MenuTreeItem
  onOpen: (item: MenuTreeItem) => void
  /** Optional rendered name (used to highlight search matches). */
  nameSlot?: ReactNode
}) {
  const state = itemState(item)
  const unavailable = state !== "available"
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="relative flex w-full items-stretch gap-3.5 border-t border-border/60 px-[18px] py-3.5 text-left transition-colors first:border-t-0 active:bg-secondary"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "text-base leading-tight font-semibold tracking-[-0.005em]",
            unavailable && "text-muted-foreground"
          )}
        >
          {nameSlot ?? item.name}
        </div>
        {item.description && (
          <p className="mt-[3px] line-clamp-2 text-[13.5px] leading-snug text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <TagChip key={t.id} label={t.label} />
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2.5">
          {unavailable ? (
            <UnavailTag state={state} />
          ) : (
            <>
              <Price item={item} />
              {item.calories != null && (
                <span className="font-mono text-[11.5px] text-[var(--text-faint)]">
                  · {item.calories} kcal
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <Thumbnail item={item} state={state} />
    </button>
  )
}
