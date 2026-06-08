"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { type ReactElement, useRef } from "react"

import { type Table } from "@repo/schemas"
import { Button } from "@repo/ui/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog"

import { tableQrUrl } from "../qr"

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Per-table QR as a print-ready placement card: restaurant → QR → "scan for
 * menu" → table + area. The card (not the bare code) is what staff print or
 * download, so it can go straight onto the table. The encoded URL is keyed by
 * `table.id`, so it survives renames/moves (FR-021/FR-023).
 */
export function QrSheet({
  slug,
  restaurantName,
  areaName,
  table,
  trigger,
}: {
  slug: string
  restaurantName: string
  areaName: string
  table: Table
  trigger: ReactElement
}) {
  const qrRef = useRef<HTMLCanvasElement>(null)
  const url = tableQrUrl(slug, table.id)

  /** Compose the full placement card to an offscreen canvas. */
  function composeCard(): HTMLCanvasElement | null {
    const qr = qrRef.current
    if (!qr) return null
    const W = 760
    const H = 1000
    const scale = 2
    const cvs = document.createElement("canvas")
    cvs.width = W * scale
    cvs.height = H * scale
    const ctx = cvs.getContext("2d")
    if (!ctx) return null
    ctx.scale(scale, scale)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = "#e3e3e8"
    ctx.lineWidth = 2
    roundRect(ctx, 40, 40, W - 80, H - 80, 28)
    ctx.stroke()
    ctx.textAlign = "center"
    ctx.fillStyle = "#7a7a85"
    ctx.font = "600 26px Geist, sans-serif"
    ctx.fillText(restaurantName.toUpperCase(), W / 2, 150)
    const qrSize = 380
    const qx = (W - qrSize) / 2
    const qy = 210
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qr, qx, qy, qrSize, qrSize)
    ctx.fillStyle = "#15151c"
    ctx.font = "600 40px Geist, sans-serif"
    ctx.fillText("Menü için okutun", W / 2, qy + qrSize + 90)
    ctx.fillStyle = "#9a9aa3"
    ctx.font = "400 22px Geist, sans-serif"
    ctx.fillText(
      "Telefon kameranızı QR koda doğrultun",
      W / 2,
      qy + qrSize + 128
    )
    ctx.strokeStyle = "#e3e3e8"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(120, qy + qrSize + 180)
    ctx.lineTo(W - 120, qy + qrSize + 180)
    ctx.stroke()
    ctx.fillStyle = "#15151c"
    ctx.font = "700 52px Geist, sans-serif"
    ctx.fillText(table.label, W / 2, qy + qrSize + 250)
    ctx.fillStyle = "#7a7a85"
    ctx.font = "400 26px Geist, sans-serif"
    ctx.fillText(areaName, W / 2, qy + qrSize + 290)
    return cvs
  }

  function download() {
    const cvs = composeCard()
    if (!cvs) return
    const a = document.createElement("a")
    a.href = cvs.toDataURL("image/png")
    a.download = `qr-masa-${table.label}.png`.replace(/\s+/g, "-")
    a.click()
  }

  /** Print just this card via a throwaway iframe (no popup, only the card). */
  function print() {
    const cvs = composeCard()
    if (!cvs) return
    const dataUrl = cvs.toDataURL("image/png")
    const iframe = document.createElement("iframe")
    iframe.setAttribute("aria-hidden", "true")
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
    iframe.srcdoc = `<!doctype html><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.focus();window.print()"></body>`
    document.body.appendChild(iframe)
    const win = iframe.contentWindow
    if (win) win.onafterprint = () => iframe.remove()
    window.setTimeout(() => iframe.remove(), 60_000)
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR kodu</DialogTitle>
          <DialogDescription>
            {table.label} · {areaName}
          </DialogDescription>
        </DialogHeader>

        {/* Placement card preview — always light; it's a print artifact. */}
        <div className="flex justify-center">
          <div className="w-full max-w-[18rem] rounded-2xl border border-zinc-200 bg-white px-7 py-7 text-center text-zinc-900 shadow-sm">
            <div className="truncate text-[11px] font-semibold tracking-[0.1em] text-zinc-400 uppercase">
              {restaurantName}
            </div>
            <div className="my-4 flex justify-center">
              <div className="rounded-xl border border-zinc-200 p-2.5">
                <QRCodeCanvas value={url} size={176} marginSize={0} level="M" />
              </div>
            </div>
            <div className="text-base font-semibold">Menü için okutun</div>
            <div className="mt-1 text-xs text-zinc-500">
              Telefon kameranızı QR koda doğrultun
            </div>
            <div className="mt-5 border-t border-zinc-200 pt-4">
              <div className="text-xl font-bold tracking-tight">
                {table.label}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">{areaName}</div>
            </div>
          </div>
        </div>

        {/* Hidden high-res QR — the source for print/PNG composition. */}
        <QRCodeCanvas
          ref={qrRef}
          value={url}
          size={600}
          marginSize={0}
          level="M"
          style={{ display: "none" }}
        />

        <p className="text-center text-[11px] text-balance text-muted-foreground">
          Bu kart masaya yerleştirilmek üzere tasarlandı. QR kodu bu masaya
          sabittir ve değişmez.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose
            render={<Button variant="ghost" className="sm:mr-auto" />}
          >
            Kapat
          </DialogClose>
          <Button variant="outline" onClick={print}>
            <PrinterIcon className="size-4" />
            Yazdır
          </Button>
          <Button onClick={download}>
            <DownloadIcon className="size-4" />
            PNG indir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
