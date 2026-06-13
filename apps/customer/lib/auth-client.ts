import { passkeyClient } from "@better-auth/passkey/client"
import { emailOTPClient, oneTapClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Browser client for the API's **customer** Better Auth instance (diners).
 * Optional, passwordless sign-in: a one-time email code (the same code is also
 * embedded in a one-click link) plus Google. Points at the API **origin** —
 * the customer instance's `basePath` already carries `/api/auth/customer`, so
 * we drop the `/api` that `NEXT_PUBLIC_API_URL` includes to avoid doubling it.
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL
if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set")

/** Google client ID for One Tap (safe to expose). One Tap is rendered only via
 * the apex intermediate iframe and gated on `NEXT_PUBLIC_ONE_TAP_ENABLED`. */
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export const authClient = createAuthClient({
  baseURL: new URL(apiUrl).origin,
  basePath: "/api/auth/customer",
  plugins: [
    emailOTPClient(),
    passkeyClient(),
    oneTapClient({ clientId: googleClientId }),
  ],
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, useSession, emailOtp, passkey, oneTap } =
  authClient
