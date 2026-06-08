import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { ApiError } from "@repo/api-client"
import { getQueryClient } from "@repo/query/get-query-client"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { RestaurantDetail } from "@/features/restaurants/components/restaurant-detail"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { tablesQueries } from "@/features/tables/queries"

/**
 * Admin management for a single restaurant — plain floor/area/table CRUD over
 * the same REST contract as the dashboard (no wizard, no canvas).
 */
export default async function AdminRestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const queryClient = getQueryClient()
  try {
    await queryClient.fetchQuery(restaurantsQueries.detail(slug))
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound()
    throw err
  }

  await Promise.all([
    queryClient.prefetchQuery(floorsQueries.bySlug(slug)),
    queryClient.prefetchQuery(areasQueries.bySlug(slug)),
    queryClient.prefetchQuery(tablesQueries.bySlug(slug)),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RestaurantDetail slug={slug} />
    </HydrationBoundary>
  )
}
