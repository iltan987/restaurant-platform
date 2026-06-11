import { SearchIcon } from "lucide-react"

/**
 * Restaurant identity header: a warm cover band, a serif monogram logo, the
 * name, an "open" status line, and the search entry that opens the overlay.
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
        <span className="absolute top-2.5 right-3 rounded-full bg-[oklch(0.3_0.04_45/0.28)] px-[7px] py-[3px] font-mono text-[9.5px] tracking-wide text-white/80 uppercase backdrop-blur-[2px]">
          qr · masa menüsü
        </span>
        <div className="flex w-full translate-y-[26px] items-end gap-3.5 px-[18px]">
          <span className="font-display grid size-16 shrink-0 place-items-center rounded-[18px] border border-border bg-card text-[26px] font-medium text-[var(--accent-text)] shadow-md">
            {initial}
          </span>
          <div className="min-w-0 pb-1.5">
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
