/**
 * Resolved API base URL, chosen by where the code runs:
 *
 * - **Browser** (the diner's phone): the public/LAN host from
 *   `NEXT_PUBLIC_API_URL` — the only address the device can reach.
 * - **Next server** (SSR / prefetch): `API_INTERNAL_URL` when set, e.g.
 *   `http://localhost:3000/api`. The public LAN IP often isn't routable from
 *   the server itself (WSL/containers/split-horizon DNS), which otherwise makes
 *   refreshes time out. Falls back to the public URL when no internal one is set.
 *
 * `API_INTERNAL_URL` has no `NEXT_PUBLIC_` prefix on purpose — it must never be
 * inlined into the client bundle. It's only read inside the `typeof window`
 * branch so the server-only var is never accessed (and t3-env never throws) on
 * the client.
 */
import { env } from "@/env"

export const apiBase =
  typeof window === "undefined"
    ? (env.API_INTERNAL_URL ?? env.NEXT_PUBLIC_API_URL)
    : env.NEXT_PUBLIC_API_URL
