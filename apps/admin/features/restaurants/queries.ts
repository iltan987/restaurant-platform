import { queryOptions } from "@tanstack/react-query"

import {
  fetchRestaurantBySlug,
  fetchRestaurants,
  fetchSlugAvailability,
} from "./api"

export const restaurantsQueries = {
  list: (page = 1) =>
    queryOptions({
      queryKey: ["restaurants", page],
      queryFn: () => fetchRestaurants(page),
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: ["restaurant", slug],
      queryFn: () => fetchRestaurantBySlug(slug),
    }),
  slugAvailable: (slug: string) =>
    queryOptions({
      queryKey: ["slug-available", slug],
      queryFn: () => fetchSlugAvailability(slug),
      staleTime: 30_000,
    }),
}
