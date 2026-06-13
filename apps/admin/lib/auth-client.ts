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

// `NEXT_PUBLIC_API_URL` is absolute (dev: http://localhost:3000/api, prod:
// https://api.<root>/api). The API shares the apps' parent domain, so its
// session cookie is first-party to every host under it — no proxy needed.
const baseURL = new URL(apiUrl).origin

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth/admin",
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession } = authClient
