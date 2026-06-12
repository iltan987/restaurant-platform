"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Clock, Mail, Send } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { AuthShell } from "@/components/auth-shell"
import { requestPasswordReset } from "@/lib/auth-client"

const forgotSchema = z.object({ email: z.email() })
type ForgotValues = z.infer<typeof forgotSchema>

/**
 * Request a password-reset link. We always show the same confirmation whether
 * or not the email exists (no account enumeration); Better Auth only sends the
 * mail when there's a matching account.
 */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: ForgotValues) {
    await requestPasswordReset({
      email: values.email,
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    })
    // Indistinguishable outcome regardless of whether the account exists.
    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <AuthShell>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <Mail className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          E-postanızı kontrol edin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Eğer <span className="font-medium text-foreground">{sentTo}</span>{" "}
          adresine ait bir hesap varsa, şifre sıfırlama bağlantısı gönderdik.
        </p>
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            Bağlantı yaklaşık 1 saat geçerlidir. E-posta gelmediyse spam
            klasörünüzü kontrol edin.
          </span>
        </div>
        <Button
          variant="outline"
          className="mt-6 h-9 w-full"
          render={<Link href="/giris" />}
        >
          Girişe dön
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Link
        href="/giris"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Girişe dön
      </Link>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          Şifrenizi mi unuttunuz?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          E-posta adresinizi girin; şifrenizi sıfırlamanız için bir bağlantı
          gönderelim.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-posta</Label>
          <div className="relative">
            <Mail className="absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="ad@restoraniniz.com"
              className="pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-9">
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Gönderiliyor…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Sıfırlama bağlantısı gönder
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
