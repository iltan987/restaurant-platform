"use client"

import { Fingerprint } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@repo/ui/components/ui/button"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { signIn } from "@/lib/auth-client"

const noopSubscribe = () => () => {}

/** Sign-in outcomes that aren't real failures — keep them silent and leave the
 * login view as-is. WebAuthn deliberately returns the same `NotAllowedError`
 * for "user cancelled" and "this device has no passkey" (it won't reveal which),
 * which `@simplewebauthn` surfaces as `ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY`; so
 * tapping the button with no passkey saved is benign, not an error to toast.
 * `AUTH_CANCELLED` is Better Auth's generic cancel/verify-abort code. */
const SILENT_SIGNIN_CODES = new Set([
  "AUTH_CANCELLED",
  "ERROR_CEREMONY_ABORTED",
  "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
])

/** Whether this browser exposes WebAuthn at all. `useSyncExternalStore` reads it
 * client-side (server snapshot `false`) with no hydration mismatch. Gate both
 * the passkey button and its divider on it. */
export function useWebauthnSupported() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof PublicKeyCredential !== "undefined",
    () => false
  )
}

/**
 * Explicit "sign in with a passkey" button — the discoverable, re-usable
 * counterpart to the email field's silent autofill (which only fires once and
 * can't be re-triggered). Modal prompt; silent on user cancel, surfaces real
 * failures. `onSuccess` handles post-sign-in navigation/feedback.
 */
export function PasskeySignInButton({ onSuccess }: { onSuccess: () => void }) {
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    const res = await signIn.passkey()
    setPending(false)
    if (res?.error) {
      const code = "code" in res.error ? res.error.code : undefined
      if (!code || !SILENT_SIGNIN_CODES.has(code)) {
        toast.error("Geçiş anahtarı ile giriş yapılamadı.")
      }
      return
    }
    onSuccess()
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <Fingerprint className="size-4" />
      )}
      Geçiş anahtarı ile giriş
    </Button>
  )
}
