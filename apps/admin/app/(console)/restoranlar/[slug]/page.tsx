import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { ApiError } from "@repo/api-client"
import { getQueryClient } from "@repo/query/get-query-client"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { menuQueries } from "@/features/menu/queries"
import { RestaurantDetail } from "@/features/restaurants/components/restaurant-detail"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { tablesQueries } from "@/features/tables/queries"

/**
 * Admin management for a single restaurant — tabbed console detail (hero,
 * Özet, Profil, Kat planı, Menü, QR). Prefetches the restaurant plus its
 * floors/areas/tables/menu so the Özet/Kat planı/Menü/QR tabs render without
 * a flash.
 */
export default async function RestaurantDetailPage({
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
    queryClient.prefetchQuery(menuQueries.categories(slug)),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RestaurantDetail slug={slug} />
    </HydrationBoundary>
  )
}
