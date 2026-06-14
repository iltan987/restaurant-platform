"use client"

import { Fingerprint } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@repo/ui/components/ui/button"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { signIn } from "@/lib/auth-client"

const noopSubscribe = () => () => {}

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
      if (code && code !== "AUTH_CANCELLED") {
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
