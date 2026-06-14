"use client"

import { useEffect, useRef } from "react"

import { signIn } from "@/lib/auth-client"

/**
 * Passkey conditional UI (WebAuthn autofill): while `enabled`, ask the browser
 * to surface any registered passkey in an email field marked
 * `autoComplete="... webauthn"`. No-op where conditional mediation is
 * unsupported, and silent when the diner has no passkey. `onSuccess` runs after
 * a passkey signs the diner in. Kept in a ref so the request restarts only on
 * `enabled` changes, not on every render of the caller.
 */
export function usePasskeyAutofill(enabled: boolean, onSuccess: () => void) {
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    if (!enabled) return
    if (typeof PublicKeyCredential === "undefined") return
    if (!PublicKeyCredential.isConditionalMediationAvailable) return
    let cancelled = false
    void PublicKeyCredential.isConditionalMediationAvailable().then((ok) => {
      if (!ok || cancelled) return
      void signIn.passkey({ autoFill: true }).then((res) => {
        if (cancelled || res?.error) return
        onSuccessRef.current()
      })
    })
    return () => {
      cancelled = true
    }
  }, [enabled])
}
