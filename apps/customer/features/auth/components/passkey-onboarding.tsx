"use client"

import { Fingerprint } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { passkey, useListPasskeys, useSession } from "@/lib/auth-client"

import { passkeyAddErrorMessage } from "../passkey-errors"
import {
  completePasskeyPrompt,
  declinePasskeyPrompt,
  recordPasskeyPromptShown,
  shouldPromptPasskey,
  snoozePasskeyPrompt,
} from "../passkey-prompt-state"

/** User ids already prompted in this tab, so client-side navigation can't
 * re-pop the sheet even after the snooze cooldown elapses mid-session. */
const shownThisSession = new Set<string>()

/** A sign-in within this window of account creation counts as "first login". */
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000

function isFreshAccount(
  createdAt: Date | string | number | undefined
): boolean {
  if (!createdAt) return false
  const ts = new Date(createdAt).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < NEW_ACCOUNT_WINDOW_MS
}

/**
 * Respectful, dismissible nudge to register a passkey, shown after a diner signs
 * in with no passkey yet. Mounted globally so it fires from every entry point —
 * the floating account drawer and the `/giris` page alike. Conditional UI can
 * only surface a passkey that already exists, so without this nudge the pool
 * stays empty and autofill never has anything to offer.
 *
 * Cadence is bank-app gentle, not spam: brand-new accounts are prompted on first
 * login; everyone else gets at most an occasional reminder (see
 * `passkey-prompt-state`). "İstemiyorum" silences it for good; "Daha sonra"
 * snoozes it past a long cooldown.
 */
export function PasskeyOnboarding() {
  const { data: session } = useSession()
  const { data: passkeys } = useListPasskeys()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const userId = session?.user.id
  const createdAt = session?.user.createdAt

  // Open once when a signed-in diner has no passkey, a platform authenticator
  // (Touch ID / Windows Hello / Android) is available, and the cadence allows it.
  useEffect(() => {
    if (!userId || open) return
    if (!passkeys || passkeys.length > 0) return
    if (shownThisSession.has(userId)) return
    if (typeof PublicKeyCredential === "undefined") return
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      return
    const newAccount = isFreshAccount(createdAt)
    if (!shouldPromptPasskey(userId, { isNewAccount: newAccount })) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
      (ok) => {
        if (!ok || cancelled) return
        // Small delay so we don't collide with a sign-in sheet closing.
        timer = setTimeout(() => {
          if (cancelled) return
          setIsNew(newAccount)
          shownThisSession.add(userId)
          recordPasskeyPromptShown(userId)
          setOpen(true)
        }, 600)
      }
    )
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [userId, passkeys, open, createdAt])

  // "Daha sonra" / swipe-away: soft snooze, remind again only past the cooldown.
  function snooze() {
    if (userId) snoozePasskeyPrompt(userId)
    setOpen(false)
  }

  // "İstemiyorum": never ask again on this device.
  function decline() {
    if (userId) declinePasskeyPrompt(userId)
    setOpen(false)
  }

  async function add() {
    setPending(true)
    const res = await passkey.addPasskey({})
    setPending(false)
    if (res?.error) {
      console.error("addPasskey failed", res.error)
      const code = "code" in res.error ? res.error.code : undefined
      toast.error(passkeyAddErrorMessage(code))
      return
    }
    if (userId) completePasskeyPrompt(userId)
    toast.success(
      "Geçiş anahtarı eklendi. Bir dahaki sefere tek dokunuşla girin."
    )
    setOpen(false)
  }

  return (
    <Drawer open={open} onOpenChange={(v) => (v ? setOpen(true) : snooze())}>
      <DrawerContent className="menu-scope overflow-hidden bg-card outline-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-0">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-2 pb-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Fingerprint className="size-6" />
          </div>
          <div className="space-y-1.5">
            <DrawerTitle className="font-display text-2xl font-medium tracking-tight">
              {isNew
                ? "Tek dokunuşla girin"
                : "Daha hızlı giriş ister misiniz?"}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Geçiş anahtarı, bu cihazın parmak izi ya da yüz tanımasıyla giriş
              yapmanızı sağlar — kod beklemeden, şifre olmadan, daha güvenli.
            </DrawerDescription>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button className="h-11" disabled={pending} onClick={add}>
              {pending ? (
                <Spinner className="size-4" />
              ) : (
                <Fingerprint className="size-4" />
              )}
              Geçiş anahtarı ekle
            </Button>
            <Button
              variant="ghost"
              className="h-10 text-muted-foreground"
              disabled={pending}
              onClick={snooze}
            >
              Daha sonra
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={decline}
              className="mt-0.5 text-xs text-muted-foreground/70 underline-offset-4 transition-colors hover:text-muted-foreground hover:underline disabled:opacity-50"
            >
              İstemiyorum, bir daha sorma
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
