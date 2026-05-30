import { QueryClient } from "@tanstack/react-query"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set staleTime > 0 so hydrated data isn't immediately
        // refetched on the client after server prefetch.
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

/**
 * Returns a QueryClient suitable for the current environment:
 * - Server: always a fresh client (avoids cross-request data leaks).
 * - Browser: module-level singleton (avoids discarding client on Suspense).
 *
 * Import in server components to prefetch, and in the QueryProvider for the
 * client-side context — both will get the same instance in the browser.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
