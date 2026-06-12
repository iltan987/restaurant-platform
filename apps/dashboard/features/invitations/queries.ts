import { queryOptions } from "@tanstack/react-query"

import { lookupInvitation } from "./api"

export const invitationsQueries = {
  /** Look up an invitation for the acceptance screen. No retry — a terminal
   * state (used/expired/revoked) shouldn't be retried. */
  lookup: (token: string) =>
    queryOptions({
      queryKey: ["invitation", token],
      queryFn: () => lookupInvitation(token),
      retry: false,
    }),
}
