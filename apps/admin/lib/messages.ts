import { ErrorCode } from "@repo/schemas"

/** Maps API error codes to Turkish user-facing messages. */
export const errorMessages: Record<string, string> = {
  // Generic fallbacks (from global exception filter)
  [ErrorCode.NOT_FOUND]: "Kayıt bulunamadı.",
  [ErrorCode.CONFLICT]: "Çakışma hatası.",
  [ErrorCode.VALIDATION_ERROR]: "Lütfen formu kontrol edin.",
  [ErrorCode.INTERNAL_ERROR]: "Beklenmeyen bir hata oluştu.",
  // Domain-specific
  [ErrorCode.SLUG_TAKEN]: "Bu kısa ad zaten kullanımda.",
  [ErrorCode.RESTAURANT_NOT_FOUND]: "Restoran bulunamadı.",
}

export function getErrorMessage(code: string | undefined): string {
  return (code && errorMessages[code]) ?? "Bir hata oluştu."
}
