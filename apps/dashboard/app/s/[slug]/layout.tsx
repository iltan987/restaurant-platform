import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { notFound } from "next/navigation"

import { getQueryClient } from "@repo/query/get-query-client"

import { TenantShell } from "@/components/shell/tenant-shell"
import { restaurantsQueries } from "@/features/restaurants/queries"

/**
 * Tenant workspace layout. Prefetches the restaurant so the shell (sidebar,
 * topbar, onboarding branch) hydrates instantly on every route, then defers the
 * session gate + chrome to the client `TenantShell`.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const queryClient = getQueryClient()
  const restaurant = await queryClient.fetchQuery(
    restaurantsQueries.detail(slug)
  )
  if (!restaurant) notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TenantShell slug={slug}>{children}</TenantShell>
    </HydrationBoundary>
  )
}
