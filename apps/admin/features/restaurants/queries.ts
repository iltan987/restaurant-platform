import { queryOptions } from "@tanstack/react-query"
import { fetchRestaurants } from "./api"

export const restaurantsQueries = {
  list: () =>
    queryOptions({
      queryKey: ["restaurants"],
      queryFn: fetchRestaurants,
    }),
}
