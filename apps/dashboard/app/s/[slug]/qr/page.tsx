import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { QrPrintSheet } from "@/features/tables/components/qr-print-sheet"
import { tablesQueries } from "@/features/tables/queries"

/**
 * Print-all QR sheet for a tenant. Server-prefetches the structure so the
 * sheet renders instantly, then the client view groups every table's QR by
 * floor/area for a single print action (FR-024/FR-025).
 */
export default async function QrPrintPage({
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
      <QrPrintSheet restaurant={restaurant} />
    </HydrationBoundary>
  )
}
