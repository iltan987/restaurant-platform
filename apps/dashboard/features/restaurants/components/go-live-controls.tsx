"use client"

import { RocketIcon } from "lucide-react"
import { useState } from "react"

import { type Restaurant } from "@repo/schemas"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/ui/alert-dialog"
import { Button } from "@repo/ui/components/ui/button"

import { useSetOnboarding } from "../use-set-onboarding"
import { useSetStatus } from "../use-set-status"

export function GoLiveControls({
  restaurant,
  tableCount,
}: {
  restaurant: Restaurant
  tableCount: number
}) {
  const slug = restaurant.slug
  const setStatus = useSetStatus(slug)
  const setOnboarding = useSetOnboarding(slug)
  const [skipOpen, setSkipOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canGoLive = tableCount > 0
  const pending = setStatus.isPending || setOnboarding.isPending

  function goLive() {
    setStatus.mutate(
      { id: restaurant.id, status: "ACTIVE" },
      {
        onSuccess: () =>
          setOnboarding.mutate({
            id: restaurant.id,
            onboardingStatus: "COMPLETED",
          }),
      }
    )
  }

  function skip() {
    setOnboarding.mutate({ id: restaurant.id, onboardingStatus: "SKIPPED" })
    setSkipOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          size="lg"
          onClick={() => setConfirmOpen(true)}
          disabled={!canGoLive || pending}
          aria-describedby={!canGoLive ? "go-live-hint" : undefined}
        >
          <RocketIcon className="size-4" />
          Yayına Al
        </Button>

        <Button
          variant="ghost"
          onClick={() => setSkipOpen(true)}
          disabled={pending}
        >
          Şimdilik geç
        </Button>
      </div>

      {!canGoLive && (
        <p id="go-live-hint" className="text-xs text-muted-foreground">
          Yayına almadan önce en az bir masa eklemelisiniz.
        </p>
      )}

      <AlertDialog open={skipOpen} onOpenChange={setSkipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kurulumu şimdilik geç</AlertDialogTitle>
            <AlertDialogDescription>
              Restoranınız yayına alınmayacak ve müşteriler menüyü göremeyecek.
              Kuruluma istediğiniz zaman buradan devam edebilirsiniz.
              {canGoLive
                ? " Hazırsanız bunun yerine hemen yayına alabilirsiniz."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            {canGoLive && (
              <Button
                variant="outline"
                onClick={() => {
                  setSkipOpen(false)
                  setConfirmOpen(true)
                }}
              >
                Yayına Al
              </Button>
            )}
            <AlertDialogAction onClick={skip}>Geç ve çık</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restoranı yayına al</AlertDialogTitle>
            <AlertDialogDescription>
              Yayına aldığınızda müşteriler masa QR kodlarını okutup menünüzü
              görebilir. İstediğiniz zaman tekrar yayından kaldırabilir veya
              kuruluma geri dönebilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                goLive()
              }}
            >
              <RocketIcon className="size-4" />
              Yayına Al
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
