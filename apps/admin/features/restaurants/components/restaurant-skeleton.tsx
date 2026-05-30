import { Card, CardContent } from "@repo/ui/components/card"
import { Skeleton } from "@repo/ui/components/skeleton"

export function RestaurantSkeleton() {
  return (
    <Card size="sm" className="gap-0">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="size-3.5 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
