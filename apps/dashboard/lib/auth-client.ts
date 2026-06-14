import { passkeyClient } from "@better-auth/passkey/client"
import { createAuthClient } from "better-auth/react"

import { env } from "@/env"

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

// `NEXT_PUBLIC_API_URL` is absolute (dev: http://localhost:3000/api, prod:
// https://api.<root>/api). The API shares the apps' parent domain, so its
// session cookie is first-party to every `<slug>.<root>` host — no proxy needed.
const baseURL = new URL(env.NEXT_PUBLIC_API_URL).origin

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
