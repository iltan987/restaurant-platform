import { queryOptions } from "@tanstack/react-query"

import { fetchItems } from "./api"

export const menuItemsQueries = {
  byCategory: (categoryId: string) =>
    queryOptions({
      queryKey: ["menu-items", categoryId],
      queryFn: () => fetchItems(categoryId),
    }),
}
