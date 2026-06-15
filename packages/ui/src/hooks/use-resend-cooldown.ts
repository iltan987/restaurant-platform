"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * A resend cooldown that survives page reloads. The "until" epoch-ms is kept in
 * `localStorage[storageKey]`, so refreshing the page can't shorten the wait —
 * the client-side half of the OTP/reset-email spam protection (the server-side
 * rate limit is the other half).
 *
 * Modeled as an external store (`useSyncExternalStore`) so the persisted value
 * is read without a setState-in-effect or a hydration mismatch: SSR sees 0, the
 * client reconciles to the real remaining seconds. The 1s subscription ticks the
 * countdown down; once it settles at 0 the snapshot stops changing, so React
 * stops re-rendering even though the interval keeps polling.
 *
 * `storageKey` should be purpose+email scoped (e.g. `resend:otp:<email>`) so
 * distinct emails cool down independently.
 */
export function useResendCooldown(storageKey: string, seconds = 60) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, 1000)
      // Cross-tab: another tab starting/clearing the same cooldown.
      const onStorage = (e: StorageEvent) => {
        if (e.key === storageKey) onChange()
      }
      window.addEventListener("storage", onStorage)
      return () => {
        clearInterval(id)
        window.removeEventListener("storage", onStorage)
      }
    },
    [storageKey]
  )

  const getSnapshot = useCallback(() => {
    const raw = window.localStorage.getItem(storageKey)
    const until = raw ? Number(raw) : 0
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
  }, [storageKey])

  const remaining = useSyncExternalStore(subscribe, getSnapshot, () => 0)

  const start = useCallback(() => {
    const until = Date.now() + seconds * 1000
    window.localStorage.setItem(storageKey, String(until))
    // `storage` only fires in *other* tabs, so wake this tab's subscriber too.
    window.dispatchEvent(new StorageEvent("storage", { key: storageKey }))
  }, [storageKey, seconds])

  return { remaining, canResend: remaining === 0, start }
}
