"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { UserPlus, X } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"

import {
  hasPermission,
  type InviteMemberInput,
  inviteMemberSchema,
  type RestaurantRole,
} from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Input } from "@repo/ui/components/ui/input"
import { Label } from "@repo/ui/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select"
import { Spinner } from "@repo/ui/components/ui/spinner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { ToneBadge } from "@/components/tone-badge"

import { membersQueries } from "../queries"
import { useChangeRole } from "../use-change-role"
import { useInviteMember } from "../use-invite-member"
import { useRemoveMember } from "../use-remove-member"

const ROLES: RestaurantRole[] = ["OWNER", "MANAGER", "STAFF"]

const ROLE_LABEL: Record<RestaurantRole, string> = {
  OWNER: "Sahip",
  MANAGER: "Yönetici",
  STAFF: "Personel",
}

/**
 * Restaurant team management (US3). Owners can invite members with a role,
 * change roles, and remove members; everyone else sees a read-only roster. The
 * API is the real authority — this only hides controls the caller can't use.
 */
export function MembersSection({ restaurantId }: { restaurantId: string }) {
  const { data: members, isPending } = useQuery(
    membersQueries.byRestaurant(restaurantId)
  )
  const { data: memberships } = useQuery(membersQueries.memberships())

  const myRole = memberships?.find((m) => m.restaurantId === restaurantId)?.role
  const canManage = myRole ? hasPermission(myRole, "members:manage") : false

  const invite = useInviteMember(restaurantId)
  const changeRole = useChangeRole(restaurantId)
  const remove = useRemoveMember(restaurantId)

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "STAFF" },
  })
  // `useWatch` (not `form.watch`) keeps the role select memoization-safe.
  const selectedRole = useWatch({ control: form.control, name: "role" })

  const ownerCount = members?.filter((m) => m.role === "OWNER").length ?? 0

  function onInvite(values: InviteMemberInput) {
    invite.mutate(values, { onSuccess: () => form.reset() })
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">Ekip</h2>
        <p className="text-xs text-ink-3">
          Restoranınızı birlikte yönettiğiniz kişiler ve rolleri.
        </p>
      </div>

      {isPending ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-5 text-ink-3" />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle rounded-card border border-line bg-surface">
          {members?.map((m) => {
            // Guard the last owner in the UI too (the API enforces it).
            const isLastOwner = m.role === "OWNER" && ownerCount <= 1
            return (
              <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {m.email}
                </span>
                {canManage ? (
                  <Select
                    value={m.role}
                    onValueChange={(role) =>
                      changeRole.mutate({
                        userId: m.userId,
                        role: role as RestaurantRole,
                      })
                    }
                    disabled={isLastOwner || changeRole.isPending}
                  >
                    <SelectTrigger className="w-32" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <ToneBadge tone="neutral">{ROLE_LABEL[m.role]}</ToneBadge>
                )}
                {canManage ? (
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ink-3"
                        disabled={isLastOwner}
                        aria-label={`${m.email} adlı üyeyi çıkar`}
                      >
                        <X className="size-4" />
                      </Button>
                    }
                    title="Üyeyi çıkar"
                    description={
                      <>
                        <strong>{m.email}</strong> bu restorana artık
                        erişemeyecek. Kişiyi istediğiniz zaman tekrar davet
                        edebilirsiniz.
                      </>
                    }
                    confirmLabel="Çıkar"
                    destructive
                    onConfirm={() => remove.mutate(m.userId)}
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {canManage ? (
        <form
          onSubmit={form.handleSubmit(onInvite)}
          className="flex flex-col gap-3 rounded-card border border-dashed border-line-strong p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="member-email">E-posta ile davet et</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="ekip@restoran.com"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-danger">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-role">Rol</Label>
            <Select
              value={selectedRole}
              onValueChange={(role) =>
                form.setValue("role", role as RestaurantRole)
              }
            >
              <SelectTrigger id="member-role" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={invite.isPending}>
            <UserPlus className="size-4" />
            Davet et
          </Button>
        </form>
      ) : null}
    </section>
  )
}
