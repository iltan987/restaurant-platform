/**
 * Resolved API base URL, chosen by where the code runs:
 *
 * - **Browser**: the public host from `NEXT_PUBLIC_API_URL` — the address the
 *   client can reach.
 * - **Next server** (SSR / prefetch): `API_INTERNAL_URL` when set, e.g.
 *   `http://localhost:3000/api`. The public host often isn't routable from the
 *   server itself (WSL/containers/split-horizon DNS), which otherwise makes
 *   server-side fetches time out. Falls back to the public URL when unset.
 *
 * `API_INTERNAL_URL` has no `NEXT_PUBLIC_` prefix on purpose — it must never be
 * inlined into the client bundle.
 */
const publicUrl = process.env.NEXT_PUBLIC_API_URL

export const apiBase =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? publicUrl)
    : publicUrl

if (!apiBase) throw new Error("NEXT_PUBLIC_API_URL is not set")
