"use client"

import { ArrowLeft, Check, ClipboardPaste, Mail } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { useClipboardOtp } from "@repo/ui/hooks/use-clipboard-otp"
import { useResendCooldown } from "@repo/ui/hooks/use-resend-cooldown"

import { env } from "@/env"
import { GoogleButton } from "@/features/auth/components/google-button"
import {
  PasskeySignInButton,
  useWebauthnSupported,
} from "@/features/auth/components/passkey-sign-in-button"
import { usePasskeyAutofill } from "@/features/auth/use-passkey-autofill"
import { emailOtp, signIn } from "@/lib/auth-client"

const GOOGLE_ENABLED = env.NEXT_PUBLIC_GOOGLE_ENABLED === "true"

type Step = "email" | "code" | "verifying"

function SignInFlow() {
  const params = useSearchParams()
  const linkEmail = params.get("email") ?? ""
  const linkOtp = params.get("otp")
  // A failed Google sign-in returns here as `?error=<code>` (see
  // errorCallbackURL below) instead of Better Auth's bare error page.
  const googleError = params.get("error")
    ? "Google ile giriş tamamlanamadı. Lütfen tekrar deneyin veya e-posta ile girin."
    : null

  // Where to land after sign-in: the `next` path the magic link carried (the
  // diner's table), sanitized to a same-app relative path; else the menu root.
  const nextParam = params.get("next")
  const signedInTarget = (() => {
    const safe =
      nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
        ? nextParam
        : "/"
    return `${safe}${safe.includes("?") ? "&" : "?"}signedin=1`
  })()

  const [step, setStep] = useState<Step>(
    linkEmail && linkOtp ? "verifying" : "email"
  )
  const [email, setEmail] = useState(linkEmail)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const { remaining, canResend, start } = useResendCooldown(
    `resend:otp:${email}`
  )
  const { canPaste, read: readClipboardOtp } = useClipboardOtp()

  // Auto-verify once when arriving from the email's one-click link (?email&otp).
  // The sign-in is inlined (rather than via `verify`) so the effect's only deps
  // are the params, and every setState runs after the await — the canonical
  // fetch-on-mount shape. The `tried` ref guards against re-runs.
  const tried = useRef(false)
  useEffect(() => {
    if (tried.current || !linkEmail || !linkOtp) return
    tried.current = true
    void (async () => {
      const { error: err } = await signIn.emailOtp({
        email: linkEmail,
        otp: linkOtp,
      })
      if (err) {
        setError("Kod geçersiz veya süresinin dolmuş olabilir.")
        setEmail(linkEmail)
        setStep("code")
        return
      }
      window.location.assign(signedInTarget)
    })()
  }, [linkEmail, linkOtp, signedInTarget])

  const passkeySupported = useWebauthnSupported()

  // Surface a returning diner's passkey in the email field's autofill; a pick
  // signs them in and lands on the menu. Matches the account drawer's behavior.
  usePasskeyAutofill(step === "email", () =>
    window.location.assign(signedInTarget)
  )

  async function sendCode(e?: React.SyntheticEvent) {
    e?.preventDefault()
    setError(null)
    setPending(true)
    const { error: err } = await emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    })
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

  async function verify(em: string, otp: string) {
    setError(null)
    setPending(true)
    const { error: err } = await signIn.emailOtp({ email: em, otp })
    setPending(false)
    if (err) {
      setError("Kod geçersiz veya süresinin dolmuş olabilir.")
      setEmail(em)
      setStep("code")
      return
    }
    window.location.assign(signedInTarget)
  }

  async function pasteCode() {
    const digits = await readClipboardOtp()
    if (!digits) {
      setError("Panoda 6 haneli bir kod bulunamadı.")
      return
    }
    setCode(digits)
    void verify(email, digits)
  }

  return (
    <main className="menu-scope flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Hesabınıza girin
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            İsteğe bağlı — menüye göz atmak için giriş gerekmez.
          </p>
        </div>

        {googleError ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
          >
            {googleError}
          </p>
        ) : null}

        {step === "verifying" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Spinner className="size-6 text-primary" />
            Giriş yapılıyor…
          </div>
        ) : step === "email" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-posta</Label>
              <div className="relative">
                <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  // `webauthn` (last) opts the field into passkey conditional UI;
                  // see usePasskeyAutofill above.
                  autoComplete="email webauthn"
                  inputMode="email"
                  autoFocus
                  required
                  placeholder="siz@ornek.com"
                  className="h-10 pl-9"
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

            <Button type="submit" disabled={pending || !email} className="h-10">
              {pending ? <Spinner className="size-4" /> : null}
              Giriş bağlantısı gönder
            </Button>

            {GOOGLE_ENABLED || passkeySupported ? (
              <>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> veya
                  <span className="h-px flex-1 bg-border" />
                </div>
                {GOOGLE_ENABLED ? (
                  <GoogleButton
                    label="Google ile devam et"
                    onClick={() =>
                      signIn.social({
                        provider: "google",
                        callbackURL: `${window.location.origin}/?signedin=1`,
                        // Failures return to this page as `?error=` (see above),
                        // not Better Auth's built-in error page.
                        errorCallbackURL: `${window.location.origin}/giris`,
                      })
                    }
                  />
                ) : null}
                {passkeySupported ? (
                  <PasskeySignInButton
                    onSuccess={() => window.location.assign(signedInTarget)}
                  />
                ) : null}
              </>
            ) : null}
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void verify(email, code)
            }}
            className="flex flex-col gap-4"
            noValidate
          >
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span>{" "}
              adresine bir giriş bağlantısı ve 6 haneli kod gönderdik. Koda
              tıklayın ya da kodu girin.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Giriş kodu</Label>
              <div className="relative">
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  placeholder="123456"
                  className="h-11 px-11 text-center text-lg tracking-[0.4em]"
                  value={code}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setCode(next)
                    // Submit as soon as the code is complete (typed last digit,
                    // pasted, or one-time-code autofill) — no extra button press.
                    if (next.length === 6 && !pending) void verify(email, next)
                  }}
                />
                {canPaste ? (
                  <button
                    type="button"
                    onClick={() => void pasteCode()}
                    disabled={pending}
                    aria-label="Panodan yapıştır"
                    title="Panodan yapıştır"
                    className="absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <ClipboardPaste className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending || code.length < 6}
              className="h-10"
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

        <p className="mt-8 text-center text-sm">
          <Link
            href="/"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Menüye dön
          </Link>
        </p>
      </div>
    </main>
  )
}

/**
 * Optional diner sign-in. Email entry → a single email with a one-click link
 * and a 6-digit code (either signs in); arriving via the link auto-verifies.
 * `useSearchParams` requires a Suspense boundary.
 */
export default function CustomerSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="menu-scope flex min-h-svh items-center justify-center bg-background">
          <Spinner className="size-6 text-primary" />
        </main>
      }
    >
      <SignInFlow />
    </Suspense>
  )
}
