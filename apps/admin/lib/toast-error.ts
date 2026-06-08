import { toast } from "sonner"

import { ApiError } from "@repo/api-client"
import { getErrorMessage } from "@repo/i18n"

/** Maps an unknown mutation error to a Turkish toast (API code → message). */
export function toastApiError(err: unknown): void {
  toast.error(
    err instanceof ApiError
      ? getErrorMessage(err.code)
      : "Sunucuya ulaşılamadı."
  )
}
