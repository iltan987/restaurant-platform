import { ExternalLinkIcon } from "lucide-react"

import { type Restaurant } from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Card, CardContent } from "@repo/ui/components/ui/card"
import { Spinner } from "@repo/ui/components/ui/spinner"

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

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={restaurant.status === "ACTIVE" ? "default" : "outline"}
            className={
              restaurant.status === "ACTIVE"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : ""
            }
          >
            {restaurant.status === "ACTIVE" ? "Aktif" : "Pasif"}
          </Badge>

          {!pending && (
            <a
              href={tenantUrl(restaurant.slug)}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`${restaurant.name} — yeni sekmede aç`}
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
