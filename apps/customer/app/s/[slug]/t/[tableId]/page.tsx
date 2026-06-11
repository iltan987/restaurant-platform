import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { MenuView } from "@/features/menu/components/menu-view"
import { menuQueries } from "@/features/menu/queries"
import { NotAvailable } from "@/features/restaurants/components/storefront"
import { restaurantsQueries } from "@/features/restaurants/queries"
import { tablesQueries } from "@/features/tables/queries"

/**
 * The QR target: `<slug>.<root>/t/<tableId>`. The menu shows **only** when the
 * restaurant is ACTIVE *and* the table resolves; any other combination shows
 * "not available yet" (FR-028/FR-029). Unknown slug → not-found.
 *
 * All three fetches run through the query client so the menu hydrates into the
 * client cache (visible in TanStack Query DevTools); `MenuView` reads it via
 * `useQuery` and renders instantly from the dehydrated state.
 */
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; tableId: string }>
}) {
  const { slug, tableId } = await params

  const queryClient = getQueryClient()
  const [restaurant, table, menu] = await Promise.all([
    queryClient.fetchQuery(restaurantsQueries.detail(slug)),
    queryClient.fetchQuery(tablesQueries.byId(slug, tableId)),
    queryClient.fetchQuery(menuQueries.tree(slug)),
  ])
  if (!restaurant) notFound()

  if (restaurant.status !== "ACTIVE" || !table || !menu) {
    return <NotAvailable name={restaurant.name} />
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuView slug={slug} tableLabel={table.label} />
    </HydrationBoundary>
  )
}
