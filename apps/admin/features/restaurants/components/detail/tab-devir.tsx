"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import {
  Check,
  Clock,
  Copy,
  Info,
  Mail,
  Pause,
  Play,
  RotateCw,
  Users,
  UserX,
  X,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import {
  type InviteOwnerInput,
  inviteOwnerSchema,
  type RestaurantWithCounts,
} from "@repo/schemas"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/ui/alert-dialog"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import { Spinner } from "@repo/ui/components/ui/spinner"
import { cn } from "@repo/ui/lib/utils"

import { Panel, PanelHeader } from "@/components/console/panel"
import { isoDate } from "@/lib/format"

import { invitationsQueries, ownerQueries } from "../../../invitations/queries"
import { useDirectAssign } from "../../../invitations/use-direct-assign"
import { useInviteOwner } from "../../../invitations/use-invite-owner"
import { useRemoveOwner } from "../../../invitations/use-remove-owner"
import { useRevokeInvitation } from "../../../invitations/use-revoke-invitation"
import { useToggleSuspension } from "../../../invitations/use-toggle-suspension"
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

export function TabDevir({ r }: { r: RestaurantWithCounts }) {
  const setupDone = setupProgress(r).pct === 100
  const isLive = r.status === "ACTIVE"
  const [formMode, setFormMode] = useState<"email" | "direct">("email")

  const { data: owner, isPending: ownerPending } = useQuery(
    ownerQueries.byRestaurant(r.id)
  )
  const { data: invitations, isPending: invitationsPending } = useQuery(
    invitationsQueries.byRestaurant(r.id)
  )
  const isPending = ownerPending || invitationsPending

  const invite = useInviteOwner(r.id)
  const revoke = useRevokeInvitation(r.id)
  const removeOwner = useRemoveOwner(r.id)
  const toggleSuspension = useToggleSuspension(r.id)
  const directAssignMutation = useDirectAssign(r.id)

  const pending = invitations?.find((i) => i.status === "PENDING")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteOwnerInput>({
    resolver: zodResolver(inviteOwnerSchema),
    defaultValues: { email: "" },
  })

  const [directEmail, setDirectEmail] = useState("")

  function onEmailSubmit(values: InviteOwnerInput) {
    invite.mutate(values.email, { onSuccess: () => reset() })
  }

  function onDirectSubmit(e: React.FormEvent) {
    e.preventDefault()
    directAssignMutation.mutate(directEmail, {
      onSuccess: () => setDirectEmail(""),
    })
  }

  const tempPassword = directAssignMutation.data?.tempPassword ?? null

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
        ) : owner && owner.suspended ? (
          /* ── Suspended owner ── */
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Pause className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {owner.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  Erişim askıya alındı
                </div>
              </div>
              <Badge variant="secondary">Askıda</Badge>
            </div>
            <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={toggleSuspension.isPending}
                onClick={() => toggleSuspension.mutate(false)}
              >
                {toggleSuspension.isPending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Play className="size-4" />
                )}
                Erişimi aç
              </Button>
            </div>
          </div>
        ) : owner ? (
          /* ── Active owner ── */
          <div className="rounded-xl border border-border bg-card p-4">
            {tempPassword ? (
              <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                    Geçici şifre — bir kez gösterilir
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-amber-100 px-2 py-1 font-mono text-sm text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                      {tempPassword}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        navigator.clipboard.writeText(tempPassword)
                      }
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Sahibe güvenli bir kanaldan iletiniz.
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => directAssignMutation.reset()}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <Check className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {owner.email}
                </div>
                <div className="text-xs text-muted-foreground">
                  {owner.directlyAssigned
                    ? "Doğrudan atandı"
                    : "Davet kabul edildi"}
                </div>
              </div>
              <Badge variant="secondary">Sahip atandı</Badge>
            </div>
            <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={toggleSuspension.isPending}
                onClick={() => toggleSuspension.mutate(true)}
              >
                {toggleSuspension.isPending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Pause className="size-4" />
                )}
                Askıya al
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="ghost" size="sm" />}
                >
                  <UserX className="size-4" />
                  Sahipliği kaldır
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sahibi kaldır</AlertDialogTitle>
                    <AlertDialogDescription>
                      {owner.email} adresinin sahip erişimi kaldırılacak.
                      Gerekirse yeni bir sahip davet edebilirsin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => removeOwner.mutate()}
                      disabled={removeOwner.isPending}
                      className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                    >
                      {removeOwner.isPending ? (
                        <Spinner className="size-3.5" />
                      ) : null}
                      Kaldır
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : pending ? (
          /* ── Pending email invitation ── */
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
          /* ── No owner: email invite / direct assign form ── */
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Sahip atanmadı</div>
                <div className="text-xs text-muted-foreground">
                  {setupDone
                    ? "Sahibi e-posta ile davet et veya doğrudan ata"
                    : "Önce kurulumu tamamla"}
                </div>
              </div>
            </div>

            <div className="mb-3 flex gap-1 rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => setFormMode("email")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  formMode === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Mail className="size-3.5" />
                E-posta ile davet
              </button>
              <button
                type="button"
                onClick={() => setFormMode("direct")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  formMode === "direct"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="size-3.5" />
                Doğrudan ata
              </button>
            </div>

            {formMode === "email" ? (
              <form
                onSubmit={handleSubmit(onEmailSubmit)}
                noValidate
                className="flex flex-col gap-1.5"
              >
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
              </form>
            ) : (
              <form
                onSubmit={onDirectSubmit}
                noValidate
                className="flex flex-col gap-1.5"
              >
                <Label htmlFor="direct-email">Sahip e-postası</Label>
                <div className="flex gap-2">
                  <Input
                    id="direct-email"
                    type="email"
                    autoComplete="off"
                    placeholder="sahip@ornek.com"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    disabled={!setupDone || directAssignMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={
                      !setupDone ||
                      !directEmail ||
                      directAssignMutation.isPending
                    }
                    className="shrink-0"
                  >
                    {directAssignMutation.isPending ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <Zap className="size-4" />
                    )}
                    Ata
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hesap yoksa geçici şifre oluşturulur.
                </p>
              </form>
            )}
          </div>
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
              done={!!owner || !!pending}
              next={setupDone && !owner && !pending}
              label="Sahip belirlendi"
              hint="E-posta daveti veya doğrudan atama"
            />
            <Step
              done={!!owner}
              next={!!pending}
              label="Erişim aktif"
              hint="Sahip panele erişebilir"
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
