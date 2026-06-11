"use client"

import { MoonIcon, SearchIcon, SunIcon } from "lucide-react"

import { useTheme } from "@repo/ui/components/theme-provider"

/**
 * Restaurant identity header: a warm cover band, a serif monogram logo, the
 * name, an "open" status line, and the search entry that opens the overlay.
 * A diner-facing light/dark toggle floats over the cover (top-right).
 */
export function MenuHeader({
  name,
  tableLabel,
  onSearch,
}: {
  name: string
  tableLabel?: string
  onSearch: () => void
}) {
  const initial = name.trim().charAt(0).toLocaleUpperCase("tr") || "R"
  return (
    <div>
      <div className="relative flex h-33 items-end bg-[image:var(--cover)]">
        <span className="absolute top-2.5 left-3 rounded-full bg-[oklch(0.3_0.04_45/0.28)] px-[7px] py-[3px] font-mono text-[9.5px] tracking-wide text-white/80 uppercase backdrop-blur-[2px]">
          qr · masa menüsü
        </span>
        <ThemeToggle />
        <div className="flex w-full translate-y-[26px] items-center gap-3.5 px-[18px]">
          <span
            aria-hidden
            className="font-display grid size-16 shrink-0 place-items-center rounded-[18px] border border-border bg-card text-[26px] font-semibold text-(--accent-text) shadow-md select-none"
          >
            <span className="leading-none [text-box:trim-both_cap_alphabetic]">
              {initial}
            </span>
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[23px] leading-[1.05] font-medium tracking-[-0.01em]">
              {name}
            </h1>
          </div>
        </div>
      </div>

      <div className="px-[18px] pt-[38px] pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--green-text)]">
            <span className="size-[7px] rounded-full bg-[var(--green)] shadow-[0_0_0_3px_var(--green-soft)]" />
            Açık
          </span>
          {tableLabel && (
            <>
              <span className="text-[var(--text-faint)]">·</span>
              <span className="text-[12.5px] text-muted-foreground">
                Masa {tableLabel}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="mx-[18px] mt-1 flex h-[46px] w-[calc(100%-36px)] items-center gap-2.5 rounded-full border border-border bg-card px-3.5 text-left text-[14.5px] text-muted-foreground shadow-xs"
      >
        <SearchIcon className="size-[19px] shrink-0" />
        <span className="flex-1">Menüde ara — yemek, malzeme, kategori…</span>
      </button>
    </div>
  )
}

/**
 * Light/dark toggle floating over the cover. next-themes resolves the theme in
 * an effect, so `resolvedTheme` is undefined on both the server and the first
 * client render (icon = moon); it corrects post-hydration — no mismatch.
 */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
      className="absolute top-[9px] right-[11px] z-[3] grid size-9 place-items-center rounded-full border border-white/[0.22] bg-[oklch(0.28_0.03_45/0.34)] text-white/[0.95] shadow-sm backdrop-blur-[4px] transition active:scale-[0.93] dark:border-white/[0.16] dark:bg-white/[0.12]"
    >
      {isDark ? (
        <SunIcon className="size-[18px]" />
      ) : (
        <MoonIcon className="size-[17px]" />
      )}
    </button>
  )
}
