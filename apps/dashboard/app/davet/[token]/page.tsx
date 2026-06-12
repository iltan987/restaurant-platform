"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Check, Mail, TriangleAlert } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { ApiError } from "@repo/api-client"
import { getErrorMessage } from "@repo/i18n"
import { Button } from "@repo/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { acceptInvitation } from "@/features/invitations/api"
import { invitationsQueries } from "@/features/invitations/queries"
import { signIn } from "@/lib/auth-client"

const acceptSchema = z.object({ password: z.string().min(8).max(128) })
type AcceptValues = z.infer<typeof acceptSchema>

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
    formState: { errors, isSubmitting },
  } = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { password: "" },
  })

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

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        {isPending ? (
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Davet yükleniyor…
          </CardContent>
        ) : error ? (
          <>
            <CardHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-md border border-border bg-card">
                <TriangleAlert className="size-4 text-destructive" />
              </div>
              <CardTitle>Davet kullanılamıyor</CardTitle>
              <CardDescription>
                {error instanceof ApiError
                  ? getErrorMessage(error.code)
                  : "Davet bulunamadı."}
              </CardDescription>
            </CardHeader>
          </>
        ) : data ? (
          <>
            <CardHeader>
              <CardTitle>{data.restaurantName}</CardTitle>
              <CardDescription>
                Hesabınızı oluşturmak için bir parola belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <Label>E-posta</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    {data.email}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Parola</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      En az 8 karakter.
                    </p>
                  )}
                </div>

                {formError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {formError}
                  </p>
                ) : null}

                <Button type="submit" disabled={isSubmitting} className="mt-1">
                  {isSubmitting ? (
                    <>
                      <Spinner className="size-3.5" />
                      Kaydediliyor…
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Daveti kabul et
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        ) : null}
      </Card>
    </main>
  )
}
