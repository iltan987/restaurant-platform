import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { areasQueries } from "@/features/areas/queries"
import { FloorPlanCanvas } from "@/features/floors/components/floor-plan-canvas"
import { floorsQueries } from "@/features/floors/queries"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { tablesQueries } from "@/features/tables/queries"

/**
 * Visual floor-plan canvas for a tenant. Server-prefetches the structure so the
 * canvas hydrates instantly; arranging tables persists `positionX/Y` only and
 * never affects QR codes (FR-045). All other table actions live in the list.
 */
export default async function FloorPlanPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const queryClient = getQueryClient()
  const restaurant = await queryClient.fetchQuery(
    restaurantsQueries.detail(slug)
  )
  if (!restaurant) notFound()

  await Promise.all([
    queryClient.prefetchQuery(floorsQueries.bySlug(slug)),
    queryClient.prefetchQuery(areasQueries.bySlug(slug)),
    queryClient.prefetchQuery(tablesQueries.bySlug(slug)),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FloorPlanCanvas restaurant={restaurant} />
    </HydrationBoundary>
  )
}
