import { createAuthClient } from "better-auth/react"

/**
 * Browser client for the API's **admin** Better Auth instance.
 *
 * `NEXT_PUBLIC_API_URL` carries the `/api` prefix that `apiFetch` needs, but the
 * admin instance's `basePath` already includes `/api/auth/admin`, so we point
 * the client at the API **origin** to avoid a doubled `/api`. Cookies are
 * included so the `pa.*` session cookie rides along with every request.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL
if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set")

// `NEXT_PUBLIC_API_URL` is absolute in dev (http://localhost:3000/api) and
// relative ("/api") in prod, where each app proxies /api to the API on its own
// origin so the session cookie is first-party (persists in every browser).
// Absolute → its origin; relative → the app's own origin (browser only — no
// server-side requests are issued from this client).
const baseURL = apiUrl.startsWith("http")
  ? new URL(apiUrl).origin
  : typeof window !== "undefined"
    ? window.location.origin
    : undefined

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth/admin",
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession } = authClient
