"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Check, Clock, Info, Mail, RotateCw, Users, X } from "lucide-react"
import { useForm } from "react-hook-form"

import {
  type InviteOwnerInput,
  inviteOwnerSchema,
  type RestaurantWithCounts,
} from "@repo/schemas"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { Panel, PanelHeader } from "@/components/console/panel"
import { isoDate } from "@/lib/format"

import { invitationsQueries } from "../../../invitations/queries"
import { useInviteOwner } from "../../../invitations/use-invite-owner"
import { useRevokeInvitation } from "../../../invitations/use-revoke-invitation"
import { setupProgress } from "../../lib/derive"

function Step({
  done,
  next,
  label,
  hint,
}: {
  done: boolean
  next?: boolean
  label: string
  hint: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
      <div
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : next
              ? "border-dashed border-primary text-primary"
              : "border-border"
        )}
      >
        {done ? <Check className="size-3.5" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  )
}

/**
 * Devir (owner hand-off). The admin invites the restaurant owner by email once
 * setup is complete; the owner accepts from the dashboard and takes over menu &
 * table management. Setup completion, invite state, and go-live all derive from
 * real data.
 */
export function TabDevir({ r }: { r: RestaurantWithCounts }) {
  const setupDone = setupProgress(r).pct === 100
  const isLive = r.status === "ACTIVE"

  const { data: invitations, isPending } = useQuery(
    invitationsQueries.byRestaurant(r.id)
  )
  const invite = useInviteOwner(r.id)
  const revoke = useRevokeInvitation(r.id)

  // The active owner relationship: an accepted invite wins over a pending one;
  // revoked/expired invites don't count toward the current state.
  const accepted = invitations?.find((i) => i.status === "ACCEPTED")
  const pending = invitations?.find((i) => i.status === "PENDING")
  const current = accepted ?? pending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteOwnerInput>({
    resolver: zodResolver(inviteOwnerSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: InviteOwnerInput) {
    invite.mutate(values.email, { onSuccess: () => reset() })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <h2 className="mb-3 text-[15px] font-semibold">Müşteriye devir</h2>

        <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Kurulum tamamlandıktan sonra restoran sahibini davet et. Sahip kendi
            panelinden menü ve masaları yönetir; geliştirici erişimi korunur.
          </p>
        </div>

        {isPending ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Yükleniyor…
          </div>
        ) : accepted ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {accepted.email}
              </div>
              <div className="text-xs text-muted-foreground">
                Davet kabul edildi
              </div>
            </div>
            <Badge variant="secondary">Sahip atandı</Badge>
          </div>
        ) : pending ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {pending.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  Davet beklemede · {isoDate(pending.expiresAt)} tarihinde sona
                  erer
                </div>
              </div>
              <Badge variant="secondary">Beklemede</Badge>
            </div>
            <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={invite.isPending}
                onClick={() => invite.mutate(pending.email)}
              >
                <RotateCw className="size-4" />
                Yeniden gönder
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(pending.id)}
              >
                <X className="size-4" />
                İptal et
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Sahip atanmadı</div>
                <div className="text-xs text-muted-foreground">
                  {setupDone
                    ? "Sahibi e-posta ile davet et"
                    : "Önce kurulumu tamamla"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="owner-email">Sahip e-postası</Label>
              <div className="flex gap-2">
                <Input
                  id="owner-email"
                  type="email"
                  autoComplete="off"
                  placeholder="sahip@ornek.com"
                  disabled={!setupDone || invite.isPending}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <Button
                  type="submit"
                  disabled={!setupDone || invite.isPending}
                  className="shrink-0"
                >
                  {invite.isPending ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Sahip davet et
                </Button>
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive">
                  Geçerli bir e-posta gir.
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>

      <div className="min-w-0">
        <Panel>
          <PanelHeader title="Devir adımları" />
          <div className="flex flex-col">
            <Step
              done={setupDone}
              next={!setupDone}
              label="Kurulum tamamlandı"
              hint="Profil, kat planı, menü, QR"
            />
            <Step
              done={!!current}
              next={setupDone && !current}
              label="Sahip davet edildi"
              hint="E-posta ile davet"
            />
            <Step
              done={!!accepted}
              next={!!pending}
              label="Davet kabul edildi"
              hint="Sahip hesabını oluşturdu"
            />
            <Step
              done={isLive}
              label="Yayına alındı"
              hint="Müşteri menüsü erişilebilir"
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}
