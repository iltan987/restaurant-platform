import { queryOptions } from "@tanstack/react-query"

import { fetchMenuTree } from "./api"

export const menuQueries = {
  tree: (slug: string) =>
    queryOptions({
      queryKey: ["menu", slug],
      queryFn: () => fetchMenuTree(slug),
    }),
}
