import { passkeyClient } from "@better-auth/passkey/client"
import { oneTapClient } from "better-auth/client/plugins"
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

/** Google client ID for One Tap (safe to expose). The dashboard signs in on a
 * single apex origin, so One Tap renders natively (no iframe). */
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

// `NEXT_PUBLIC_API_URL` is absolute (dev: http://localhost:3000/api, prod:
// https://api.<root>/api). The API shares the apps' parent domain, so its
// session cookie is first-party to every `<slug>.<root>` host — no proxy needed.
const baseURL = new URL(apiUrl).origin

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth/dashboard",
  plugins: [passkeyClient(), oneTapClient({ clientId: googleClientId })],
  fetchOptions: { credentials: "include" },
})

export const {
  signIn,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  passkey,
  oneTap,
} = authClient
