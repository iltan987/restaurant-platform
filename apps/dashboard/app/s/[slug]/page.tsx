import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { areasQueries } from "@/features/areas/queries"
import { floorsQueries } from "@/features/floors/queries"
import { Workspace } from "@/features/restaurants/components/workspace"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { tablesQueries } from "@/features/tables/queries"

/**
 * Staff workspace for a tenant. Unlike the customer storefront, this surface
 * is shown regardless of status — inactive restaurants are exactly the ones
 * mid-onboarding. We 404 only when the slug resolves to nothing.
 */
export default async function TenantPage({
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

  // Prefetch the structure so the wizard/management view hydrates instantly.
  await Promise.all([
    queryClient.prefetchQuery(floorsQueries.bySlug(slug)),
    queryClient.prefetchQuery(areasQueries.bySlug(slug)),
    queryClient.prefetchQuery(tablesQueries.bySlug(slug)),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Workspace slug={slug} />
    </HydrationBoundary>
  )
}
