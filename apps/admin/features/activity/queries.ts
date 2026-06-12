import { infiniteQueryOptions } from "@tanstack/react-query"

import {
  type ActivityPage,
  fetchActivity,
  fetchRestaurantActivity,
} from "./api"

/** Whether more pages remain given the last page's envelope. */
function nextPage(last: ActivityPage): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined
}

export const activityQueries = {
  global: () =>
    infiniteQueryOptions({
      queryKey: ["activity", "global"],
      queryFn: ({ pageParam }) => fetchActivity(pageParam),
      initialPageParam: 1,
      getNextPageParam: nextPage,
    }),
  byRestaurant: (slug: string) =>
    infiniteQueryOptions({
      queryKey: ["activity", "restaurant", slug],
      queryFn: ({ pageParam }) => fetchRestaurantActivity(slug, pageParam),
      initialPageParam: 1,
      getNextPageParam: nextPage,
    }),
}
