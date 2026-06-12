"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Check, Clock, Mail, Shield, Sparkles } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { ApiError } from "@repo/api-client"
import { getErrorMessage } from "@repo/i18n"
import { type RestaurantRole } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { AuthShell } from "@/components/auth-shell"
import { PasswordInput } from "@/components/password-input"
import { acceptInvitation } from "@/features/invitations/api"
import { invitationsQueries } from "@/features/invitations/queries"
import { signIn } from "@/lib/auth-client"

const acceptSchema = z.object({ password: z.string().min(8).max(128) })
type AcceptValues = z.infer<typeof acceptSchema>

const ROLE_LABEL: Record<RestaurantRole, string> = {
  OWNER: "Sahip",
  MANAGER: "Yönetici",
  STAFF: "Personel",
}

/** Two-letter mark from the restaurant name (e.g. "Boğaziçi Lokantası" → "BL"). */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
}

/**
 * Invitation acceptance. Looks the token up, lets the invitee set a password,
 * accepts, then signs them into the dashboard and sends them to their
 * restaurant(s). Lives on the apex host (the invite link points here).
 */
export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isPending, error } = useQuery(invitationsQueries.lookup(token))

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { password: "" },
  })
  const password = useWatch({ control, name: "password" })

  async function onSubmit(values: AcceptValues) {
    if (!data) return
    setFormError(null)
    try {
      await acceptInvitation(token, values.password)
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? getErrorMessage(err.code)
          : "Davet kabul edilemedi."
      )
      return
    }
    // Sign in with the just-set credentials, then land on the chooser.
    const { error: signInError } = await signIn.email({
      email: data.email,
      password: values.password,
    })
    if (signInError) {
      setFormError("Giriş yapılamadı. Lütfen tekrar deneyin.")
      return
    }
    window.location.assign("/")
  }

  if (isPending) {
    return (
      <AuthShell>
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Davet yükleniyor…
        </div>
      </AuthShell>
    )
  }

  if (error || !data) {
    return (
      <AuthShell>
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Clock className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Davet bağlantısı geçersiz
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof ApiError
            ? getErrorMessage(error.code)
            : "Bu davet bağlantısının süresi dolmuş ya da daha önce kullanılmış olabilir. Yeni bir davet için restoran yöneticinizle iletişime geçin."}
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="mb-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" /> Davet
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Ekibe katılın
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hesabınızı oluşturarak{" "}
          <span className="font-medium text-foreground">
            {data.restaurantName}
          </span>{" "}
          ekibine katılın.
        </p>
      </div>

      <div className="mb-5 flex items-center gap-3.5 rounded-xl border bg-muted/40 p-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
          {initialsOf(data.restaurantName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {data.restaurantName}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {data.invitedBy
              ? `${data.invitedBy} sizi davet etti`
              : "Bu davet sizin için oluşturuldu"}
          </div>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 text-xs font-semibold text-primary">
          <Shield className="size-3" />
          {ROLE_LABEL[data.role]}
        </span>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label>E-posta</Label>
          <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground">
            <Mail className="size-3.5" />
            <span className="truncate">{data.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Davet bu adrese gönderildi.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Parola belirleyin</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              password && password.length >= 8
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-3.5 items-center justify-center rounded-full border",
                password && password.length >= 8
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-current"
              )}
            >
              {password && password.length >= 8 ? (
                <Check className="size-2.5" />
              ) : null}
            </span>
            En az 8 karakter
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-9">
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              Kaydediliyor…
            </>
          ) : (
            <>
              <Check className="size-4" />
              Hesabı oluştur ve katıl
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  )
}
