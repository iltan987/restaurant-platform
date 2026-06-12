"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { Activity as ActivityIcon } from "lucide-react"

import { Button } from "@repo/ui/components/ui/button"
import { Skeleton } from "@repo/ui/components/ui/skeleton"

import { describeActivity } from "../describe"
import { type activityQueries } from "../queries"

/** Deterministic "YYYY-MM-DD HH:MM" (UTC) — avoids locale/hydration drift. */
function stamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ")
}

export function ActivityFeed({
  query,
  emptyText,
  limit,
}: {
  query: ReturnType<typeof activityQueries.global>
  emptyText: string
  /** Cap the list and hide load-more (for compact rails). */
  limit?: number
}) {
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(query)
  const all = data?.pages.flatMap((p) => p.items) ?? []
  const items = limit ? all.slice(0, limit) : all

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: limit ?? 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          <ActivityIcon className="size-5" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.map((a) => {
          const { icon: Icon, text } = describeActivity(a)
          return (
            <div
              key={a.id}
              className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="flex-1 text-sm">{text}</div>
              <div className="shrink-0 font-mono text-xs text-muted-foreground">
                {stamp(a.createdAt)}
              </div>
            </div>
          )
        })}
      </div>

      {!limit && hasNextPage ? (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Yükleniyor…" : "Daha fazla"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
