"use client"

import { useCallback, useSyncExternalStore } from "react"

const noop = () => () => {}

/**
 * Reads a one-time code from the clipboard on a user gesture (a button tap) —
 * the only way to surface "paste my code" for an *email* OTP, since the SMS
 * autofill paths (`autocomplete="one-time-code"`, WebOTP) don't apply to email.
 *
 * `canPaste` is resolved via `useSyncExternalStore` (server snapshot `false`, no
 * subscription) so the button can be hidden where the API is missing without a
 * setState-in-effect or a hydration mismatch. `read()` returns the first
 * `length` digits, or null when the clipboard holds no such code or the read is
 * denied — the caller decides how to message that.
 */
export function useClipboardOtp(length = 6) {
  const canPaste = useSyncExternalStore(
    noop,
    () => !!navigator.clipboard?.readText,
    () => false
  )

  const read = useCallback(async (): Promise<string | null> => {
    try {
      const text = await navigator.clipboard.readText()
      const digits = text.replace(/\D/g, "").slice(0, length)
      return digits.length === length ? digits : null
    } catch {
      return null
    }
  }, [length])

  return { canPaste, read }
}
