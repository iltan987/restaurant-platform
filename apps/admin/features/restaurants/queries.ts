import { queryOptions } from "@tanstack/react-query"

import { fetchRestaurantBySlug, fetchRestaurants } from "./api"

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
}
