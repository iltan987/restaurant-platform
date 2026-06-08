"use client"

import { useQuery } from "@tanstack/react-query"
import { RocketIcon, Undo2Icon } from "lucide-react"

import { type Restaurant } from "@repo/schemas"
import { ThemeToggle } from "@repo/ui/components/theme-toggle"
import { Badge } from "@repo/ui/components/ui/badge"
import { Button } from "@repo/ui/components/ui/button"
import { Separator } from "@repo/ui/components/ui/separator"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { AreasStep } from "@/features/areas/components/areas-step"
import { FloorsStep } from "@/features/floors/components/floors-step"
import { TablesStep } from "@/features/tables/components/tables-step"
import { tablesQueries } from "@/features/tables/queries"

import { useSetOnboarding } from "../use-set-onboarding"
import { useSetStatus } from "../use-set-status"

/**
 * Post-onboarding management. A lightweight surface for now — the full table
 * manager (per-row QR, destructive edits, floor plan) lands with later stories.
 */
export function ManagementView({ restaurant }: { restaurant: Restaurant }) {
  const slug = restaurant.slug
  const { data: tables = [] } = useQuery(tablesQueries.bySlug(slug))
  const setStatus = useSetStatus(slug)
  const setOnboarding = useSetOnboarding(slug)
  const isActive = restaurant.status === "ACTIVE"

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-3.5">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {restaurant.name}
          </h1>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              isActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isActive ? "bg-emerald-500" : "bg-muted-foreground"
              )}
            />
            {isActive ? "Yayında" : "Pasif"}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-muted-foreground">
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
            <ThemeToggle />
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
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
        <FloorsStep restaurant={restaurant} embedded />
        <AreasStep restaurant={restaurant} embedded />
        <Separator />
        <TablesStep restaurant={restaurant} embedded />
      </main>
    </div>
  )
}
