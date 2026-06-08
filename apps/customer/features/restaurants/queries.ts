import { queryOptions } from "@tanstack/react-query"

import { fetchRestaurantBySlug } from "./api"

export const restaurantsQueries = {
  detail: (slug: string) =>
    queryOptions({
      queryKey: ["restaurant", slug],
      queryFn: () => fetchRestaurantBySlug(slug),
    }),
}
