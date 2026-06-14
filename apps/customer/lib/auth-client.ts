import { passkeyClient } from "@better-auth/passkey/client"
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Browser client for the API's **customer** Better Auth instance (diners).
 * Optional, passwordless sign-in: a one-time email code (the same code is also
 * embedded in a one-click link), Google, and passkeys. Points at the API
 * **origin** — the customer instance's `basePath` already carries
 * `/api/auth/customer`, so we drop the `/api` that `NEXT_PUBLIC_API_URL`
 * includes to avoid doubling it.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL
if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set")

// `NEXT_PUBLIC_API_URL` is absolute (dev: http://localhost:3000/api, prod:
// https://api.<root>/api). The API shares the apps' parent domain, so its
// session cookie is first-party to every `<slug>.<root>` host — no proxy needed.
const baseURL = new URL(apiUrl).origin

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth/customer",
  plugins: [emailOTPClient(), passkeyClient()],
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession, emailOtp, passkey } = authClient
