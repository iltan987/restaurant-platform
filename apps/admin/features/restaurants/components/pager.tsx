"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"

type PagerProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * Defensive pager — hidden entirely until there is a second page (FR-046).
 */
export function Pager({ page, pageSize, total, onPageChange }: PagerProps) {
  if (total <= pageSize) return null

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <nav
      className="mt-4 flex items-center justify-between"
      aria-label="Sayfalama"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Önceki sayfa"
      >
        <ChevronLeftIcon className="size-4" />
        Önceki
      </Button>

      <span className="text-xs text-muted-foreground" aria-live="polite">
        Sayfa {page} / {pageCount}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Sonraki sayfa"
      >
        Sonraki
        <ChevronRightIcon className="size-4" />
      </Button>
    </nav>
  )
}
