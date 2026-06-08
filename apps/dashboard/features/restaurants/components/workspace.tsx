"use client"

import { useQuery } from "@tanstack/react-query"

import { restaurantsQueries } from "../queries"
import { ManagementView } from "./management-view"
import { SetupWizard } from "./setup-wizard"

/**
 * Tenant entry point. Reads the restaurant from the (server-prefetched) cache
 * so status/onboarding mutations flip the view live, then branches:
 * guided wizard while onboarding is in progress, management view afterwards.
 */
export function Workspace({ slug }: { slug: string }) {
  const { data: restaurant } = useQuery(restaurantsQueries.detail(slug))

  if (!restaurant) return null

  return restaurant.onboardingStatus === "IN_PROGRESS" ? (
    <SetupWizard restaurant={restaurant} />
  ) : (
    <ManagementView restaurant={restaurant} />
  )
}
