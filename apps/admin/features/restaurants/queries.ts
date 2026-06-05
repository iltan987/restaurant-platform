import { queryOptions } from "@tanstack/react-query"

import { fetchRestaurants } from "./api"

export const restaurantsQueries = {
  list: (page = 1) =>
    queryOptions({
      queryKey: ["restaurants", page],
      queryFn: () => fetchRestaurants(page),
    }),
}
