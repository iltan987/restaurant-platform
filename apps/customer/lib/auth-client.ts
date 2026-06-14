import { passkeyClient } from "@better-auth/passkey/client"
import { emailOTPClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { env } from "@/env"

/**
 * Browser client for the API's **customer** Better Auth instance (diners).
 * Optional, passwordless sign-in: a one-time email code (the same code is also
 * embedded in a one-click link), Google, and passkeys. Points at the API
 * **origin** — the customer instance's `basePath` already carries
 * `/api/auth/customer`, so we drop the `/api` that `NEXT_PUBLIC_API_URL`
 * includes to avoid doubling it.
 */

// `NEXT_PUBLIC_API_URL` is absolute (dev: http://localhost:3000/api, prod:
// https://api.<root>/api). The API shares the apps' parent domain, so its
// session cookie is first-party to every `<slug>.<root>` host — no proxy needed.
const baseURL = new URL(env.NEXT_PUBLIC_API_URL).origin

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth/customer",
  plugins: [emailOTPClient(), passkeyClient()],
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession, emailOtp, passkey } = authClient

// Passkey list hook (from the passkey plugin's `listPasskeys` atom) — drives the
// "you already have a passkey" UI and gates the post-sign-in onboarding prompt.
export const useListPasskeys = authClient.useListPasskeys
