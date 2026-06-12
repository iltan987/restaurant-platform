"use client"

import { TriangleAlertIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"

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
import { Checkbox } from "@repo/ui/components/ui/checkbox"

type ConfirmDialogProps = {
  /**
   * The element that opens the dialog (merged onto a Base UI trigger). Omit it
   * to drive the dialog yourself via `open` / `onOpenChange` (e.g. from a menu).
   */
  trigger?: ReactElement
  /** Controlled open state. When provided, the dialog is fully controlled. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: ReactNode
  /** A loud, destructive-tinted callout for the irreversible consequence. */
  warning?: ReactNode
  /** When set, the confirm button stays disabled until this box is checked. */
  requireAck?: boolean
  ackLabel?: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/**
 * Controlled confirm dialog over the Base UI alert-dialog. The action button
 * does not auto-close (Base UI semantics), so we close it explicitly after
 * firing `onConfirm`. For irreversible actions, pass `warning` and `requireAck`
 * so the consequence can't be skim-clicked past (FR-007/FR-036).
 */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  warning,
  requireAck,
  ackLabel = "Bu işlemin geri alınamayacağını anlıyorum",
  confirmLabel,
  cancelLabel = "Vazgeç",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [acked, setAcked] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  function change(next: boolean) {
    onOpenChange?.(next)
    setUncontrolledOpen(next)
    if (!next) setAcked(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      {trigger ? <AlertDialogTrigger render={trigger} /> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {warning && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            <TriangleAlertIcon className="mt-px size-4 shrink-0" />
            <div>{warning}</div>
          </div>
        )}

        {requireAck && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={acked}
              onCheckedChange={(v) => setAcked(v === true)}
            />
            <span>{ackLabel}</span>
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={requireAck && !acked}
            onClick={() => {
              onConfirm()
              change(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
