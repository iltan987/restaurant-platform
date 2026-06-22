"use client"

import { useQuery } from "@tanstack/react-query"
import { RocketIcon, Undo2Icon } from "lucide-react"

import { type Restaurant } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import { Separator } from "@repo/ui/components/ui/separator"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { AreasStep } from "@/features/areas/components/areas-step"
import { FloorsStep } from "@/features/floors/components/floors-step"
import { MembersSection } from "@/features/members/components/members-section"
import { TablesStep } from "@/features/tables/components/tables-step"
import { tablesQueries } from "@/features/tables/queries"

import { useSetOnboarding } from "../use-set-onboarding"
import { useSetStatus } from "../use-set-status"

/**
 * Post-onboarding management overview, rendered inside the app shell. Account
 * actions (theme, passkeys, sign-out) and restaurant switching live in the
 * shell; this surface owns the publish state and the structure sections.
 */
export function ManagementView({ restaurant }: { restaurant: Restaurant }) {
  const slug = restaurant.slug
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))
  const setStatus = useSetStatus(slug)
  const setOnboarding = useSetOnboarding(slug)
  const isActive = restaurant.status === "ACTIVE"

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-7 pb-20 sm:px-7">
      <PageHeader
        title={restaurant.name}
        subtitle="Restoranınızın kat planı, masaları ve ekibi."
        actions={
          <>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-ink-3">
                  <Undo2Icon className="size-4" />
                  Kuruluma dön
                </Button>
              }
              title="Kuruluma geri dön"
              description="Adım adım kurulum sihirbazına döneceksiniz. Restoranınızın yayın durumu değişmez; mevcut kat, bölge ve masalarınız korunur."
              confirmLabel="Kuruluma dön"
              onConfirm={() =>
                setOnboarding.mutate({
                  id: restaurant.id,
                  onboardingStatus: "IN_PROGRESS",
                })
              }
            />
            {isActive ? (
              <Button
                variant="outline"
                onClick={() =>
                  setStatus.mutate({ id: restaurant.id, status: "INACTIVE" })
                }
                disabled={setStatus.isPending}
              >
                Yayından Kaldır
              </Button>
            ) : (
              <ConfirmDialog
                trigger={
                  <Button disabled={setStatus.isPending || tables.length === 0}>
                    <RocketIcon className="size-4" />
                    Yayına Al
                  </Button>
                }
                title="Restoranı yayına al"
                description="Yayına aldığınızda müşteriler masa QR kodlarını okutup menünüzü görebilir. İstediğiniz zaman tekrar yayından kaldırabilirsiniz."
                confirmLabel="Yayına Al"
                onConfirm={() =>
                  setStatus.mutate({ id: restaurant.id, status: "ACTIVE" })
                }
              />
            )}
          </>
        }
      />

      <div className="flex flex-col gap-8">
        <FloorsStep restaurant={restaurant} embedded />
        <AreasStep restaurant={restaurant} embedded />
        <Separator />
        <TablesStep restaurant={restaurant} embedded />
        <Separator />
        <MembersSection restaurantId={restaurant.id} />
      </div>
    </div>
  )
}
