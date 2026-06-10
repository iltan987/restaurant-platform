import { queryOptions } from "@tanstack/react-query"

import { fetchItemDetail, fetchItems } from "./api"

export const menuItemsQueries = {
  byCategory: (categoryId: string) =>
    queryOptions({
      queryKey: ["menu-items", categoryId],
      queryFn: () => fetchItems(categoryId),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ["menu-item", id],
      queryFn: () => fetchItemDetail(id),
    }),
}
