"use client"

import {
  ArrowLeft,
  Check,
  Fingerprint,
  LogOut,
  Mail,
  Trash2,
  User,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { toast } from "@repo/ui/components/ui/sonner"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { useResendCooldown } from "@repo/ui/hooks/use-resend-cooldown"

import { env } from "@/env"
import {
  emailOtp,
  passkey,
  signIn,
  signOut,
  useListPasskeys,
  useSession,
} from "@/lib/auth-client"

import { passkeyAddErrorMessage } from "../passkey-errors"
import { markPasskeyOnboarded } from "../passkey-onboarded"
import { usePasskeyAutofill } from "../use-passkey-autofill"
import { GoogleButton } from "./google-button"
import {
  PasskeySignInButton,
  useWebauthnSupported,
} from "./passkey-sign-in-button"

const GOOGLE_ENABLED = env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

/**
 * Optional diner account control, floating over the menu cover. Signed-out: opens
 * a bottom-sheet to continue with Google or a one-time email code (the same code
 * is also in a one-click link); a previously-registered passkey is offered
 * inline via the email field's autofill (conditional UI). Signed-in: shows the
 * account + sign-out. Never blocks menu browsing. Sign-in is a browser→API XHR,
 * so the session cookie rides along on any tenant subdomain without a redirect.
 */
export function AccountButton() {
  const { data: session, isPending } = useSession()
  const { data: passkeys } = useListPasskeys()
  const [open, setOpen] = useState(false)

  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const passkeySupported = useWebauthnSupported()
  const { remaining, canResend, start } = useResendCooldown(
    `resend:otp:${email}`
  )

  function reset() {
    setStep("email")
    setCode("")
    setError(null)
    setPending(false)
  }

  // A failed Google sign-in returns to the menu as `?error=` (see
  // errorCallbackURL below); the drawer is likely closed by then, so surface it
  // as a toast and strip the param.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has("error")) return
    toast.error("Google ile giriş tamamlanamadı. Lütfen tekrar deneyin.")
    url.searchParams.delete("error")
    window.history.replaceState({}, "", url.pathname + url.search + url.hash)
  }, [])

  // Passkey conditional UI: while the sign-in sheet is open and signed-out, ask
  // the browser to surface any registered passkey in the email field's autofill
  // (no button — useless for first-time diners). New diners see nothing extra.
  usePasskeyAutofill(open && !session && step === "email", () => {
    toast.success("Hoş geldiniz!")
    setOpen(false)
    reset()
  })

  async function sendCode(e?: React.SyntheticEvent) {
    e?.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await emailOtp.sendVerificationOtp(
      { email, type: "sign-in" },
      // Carry this exact table/menu path so the email's one-click link returns
      // the diner here (the cross-origin Referer is origin-only).
      { headers: { "x-diner-path": window.location.pathname } }
    )
    setPending(false)
    if (err) {
      setError(
        err.status === 429
          ? "Çok fazla deneme. Lütfen biraz bekleyip tekrar deneyin."
          : "Kod gönderilemedi. Lütfen tekrar deneyin."
      )
      return
    }
    setCode("")
    setStep("code")
    start()
  }

  async function verify(e?: React.SyntheticEvent, otp = code) {
    e?.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await signIn.emailOtp({ email, otp })
    setPending(false)
    if (err) {
      setError("Kod geçersiz veya süresi dolmuş olabilir.")
      return
    }
    toast.success("Hoş geldiniz!")
    setOpen(false)
    reset()
  }

  async function onAddPasskey() {
    setPending(true)
    const res = await passkey.addPasskey({})
    setPending(false)
    if (res?.error) {
      // Surface the real reason (e.g. already-registered) instead of a blank
      // failure, and log the exact code for debugging.
      console.error("addPasskey failed", res.error)
      const code = "code" in res.error ? res.error.code : undefined
      toast.error(passkeyAddErrorMessage(code))
      return
    }
    if (session) markPasskeyOnboarded(session.user.id)
    toast.success(
      "Geçiş anahtarı eklendi. Bir dahaki sefere tek dokunuşla girin."
    )
  }

  async function onRemovePasskey(id: string) {
    setRemovingId(id)
    const res = await passkey.deletePasskey({ id })
    setRemovingId(null)
    if (res?.error) {
      toast.error("Geçiş anahtarı kaldırılamadı.")
      return
    }
    toast.success("Geçiş anahtarı kaldırıldı.")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={session ? "Hesabınız" : "Giriş yap"}
        className="absolute top-[9px] right-[52px] z-[3] grid size-9 place-items-center rounded-full border shadow-sm backdrop-blur-[4px] transition active:scale-[0.93] data-[in=false]:border-white/[0.22] data-[in=false]:bg-[oklch(0.28_0.03_45/0.34)] data-[in=false]:text-white/[0.95] data-[in=true]:border-white/40 data-[in=true]:bg-primary data-[in=true]:text-primary-foreground dark:data-[in=false]:border-white/[0.16] dark:data-[in=false]:bg-white/[0.12]"
        data-in={session ? "true" : "false"}
      >
        {/* Session is a client-only fetch, unknown on first paint — show a
            neutral loading dot rather than wrongly asserting the signed-out
            "person" (which then flashed to the initial for signed-in diners).
            Resolved: signed in → account initial; signed out → person. */}
        {isPending ? (
          <span className="size-2 animate-pulse rounded-full bg-white/70" />
        ) : session ? (
          <span className="text-[13px] leading-none font-semibold">
            {session.user.email.trim().charAt(0).toLocaleUpperCase("tr") || (
              <User className="size-[18px]" />
            )}
          </span>
        ) : (
          <User className="size-[18px]" />
        )}
      </button>

      <Drawer
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DrawerContent className="menu-scope overflow-hidden bg-card outline-none data-[vaul-drawer-direction=bottom]:rounded-t-[28px] data-[vaul-drawer-direction=bottom]:border-0">
          <div className="mx-auto w-full max-w-sm px-6 pt-2 pb-9">
            {session ? (
              <div className="flex flex-col gap-5 text-center">
                <DrawerTitle className="font-display text-2xl font-medium">
                  Hesabınız
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Hesap bilgileriniz ve çıkış
                </DrawerDescription>
                <div className="flex items-center justify-center gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate">{session.user.email}</span>
                </div>
                <div className="flex flex-col gap-2.5 text-left">
                  {passkeys && passkeys.length > 0 ? (
                    <>
                      <p className="px-1 text-xs font-medium text-muted-foreground">
                        Geçiş anahtarları
                      </p>
                      <ul className="flex flex-col gap-2">
                        {passkeys.map((pk) => (
                          <li
                            key={pk.id}
                            className="flex items-center gap-2.5 rounded-xl border bg-muted/40 px-3.5 py-2.5 text-sm"
                          >
                            <Fingerprint className="size-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">
                              {pk.name || "Geçiş anahtarı"}
                            </span>
                            <button
                              type="button"
                              aria-label="Geçiş anahtarını kaldır"
                              disabled={removingId === pk.id}
                              onClick={() => onRemovePasskey(pk.id)}
                              className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                            >
                              {removingId === pk.id ? (
                                <Spinner className="size-4" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={pending}
                    onClick={onAddPasskey}
                  >
                    {pending ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Fingerprint className="size-4" />
                    )}
                    {passkeys && passkeys.length > 0
                      ? "Başka bir geçiş anahtarı ekle"
                      : "Bu cihaza geçiş anahtarı ekle"}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="h-10 text-muted-foreground"
                  onClick={async () => {
                    await signOut()
                    setOpen(false)
                  }}
                >
                  <LogOut className="size-4" />
                  Çıkış yap
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 text-center">
                  <DrawerTitle className="font-display text-2xl font-medium tracking-tight">
                    Giriş yapın
                  </DrawerTitle>
                  <DrawerDescription className="mt-1.5 text-sm text-muted-foreground">
                    İsteğe bağlı — menüye göz atmak için giriş gerekmez.
                  </DrawerDescription>
                </div>

                {step === "email" ? (
                  <div className="flex flex-col gap-4">
                    {GOOGLE_ENABLED || passkeySupported ? (
                      <>
                        {GOOGLE_ENABLED ? (
                          <GoogleButton
                            label="Google ile devam et"
                            onClick={() => {
                              // Return to this exact table menu after Google
                              // (with a success flag for the toast); failures
                              // come back as `?error=` (toasted above) instead of
                              // Better Auth's built-in error page.
                              const back = new URL(window.location.href)
                              back.searchParams.set("signedin", "1")
                              signIn.social({
                                provider: "google",
                                callbackURL: back.toString(),
                                errorCallbackURL: window.location.href,
                              })
                            }}
                          />
                        ) : null}
                        {passkeySupported ? (
                          <PasskeySignInButton
                            onSuccess={() => {
                              toast.success("Hoş geldiniz!")
                              setOpen(false)
                              reset()
                            }}
                          />
                        ) : null}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="h-px flex-1 bg-border" /> veya
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      </>
                    ) : null}
                    <form onSubmit={sendCode} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="acc-email">E-posta</Label>
                        <div className="relative">
                          <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
                          <Input
                            id="acc-email"
                            type="email"
                            inputMode="email"
                            // `webauthn` (last) opts the field into passkey
                            // conditional UI; see the effect above.
                            autoComplete="email webauthn"
                            required
                            placeholder="siz@ornek.com"
                            className="h-11 pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      {error ? (
                        <p className="text-sm text-destructive" role="alert">
                          {error}
                        </p>
                      ) : null}
                      <Button
                        type="submit"
                        disabled={pending || !email}
                        className="h-11"
                      >
                        {pending ? <Spinner className="size-4" /> : null}
                        Giriş bağlantısı gönder
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={verify} className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {email}
                      </span>{" "}
                      adresine bir bağlantı ve 6 haneli kod gönderdik.
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="acc-code">Giriş kodu</Label>
                      <Input
                        id="acc-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        required
                        placeholder="123456"
                        className="h-12 text-center text-lg tracking-[0.4em]"
                        value={code}
                        onChange={(e) => {
                          const next = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                          setCode(next)
                          // Submit once complete (typed, pasted, or autofilled).
                          if (next.length === 6 && !pending)
                            void verify(undefined, next)
                        }}
                      />
                    </div>
                    {error ? (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={pending || code.length < 6}
                      className="h-11"
                    >
                      {pending ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Giriş yap
                    </Button>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email")
                          setError(null)
                        }}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ArrowLeft className="size-4" /> Farklı e-posta kullan
                      </button>
                      <button
                        type="button"
                        onClick={() => void sendCode()}
                        disabled={pending || !canResend}
                        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 disabled:hover:text-muted-foreground"
                      >
                        {canResend
                          ? "Kodu tekrar gönder"
                          : `Tekrar gönder (${remaining}s)`}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
