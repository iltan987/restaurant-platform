import { passkeyClient } from "@better-auth/passkey/client"
import { createAuthClient } from "better-auth/react"

/**
 * Browser client for the API's **dashboard** Better Auth instance (owners /
 * members). `NEXT_PUBLIC_API_URL` carries the `/api` prefix `apiFetch` needs,
 * but the dashboard instance's `basePath` already includes `/api/auth/dashboard`,
 * so we point the client at the API **origin** to avoid a doubled `/api`.
 *
 * Auth is gated client-side via `useSession()` (browser→API, credentials
 * included) so it works on any host — the API session cookie lives on the API's
 * host, independent of which tenant subdomain the dashboard runs on.
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
  basePath: "/api/auth/dashboard",
  plugins: [passkeyClient()],
  fetchOptions: { credentials: "include" },
})

export const {
  signIn,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  passkey,
} = authClient
