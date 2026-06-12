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

export const authClient = createAuthClient({
  baseURL: new URL(apiUrl).origin,
  basePath: "/api/auth/admin",
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession } = authClient
