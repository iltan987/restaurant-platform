import { ErrorCode } from "@repo/schemas"

/** Maps API error codes to Turkish user-facing messages. */
const tr: Record<string, string> = {
  // Generic fallbacks (from the global exception filter)
  [ErrorCode.NOT_FOUND]: "Kayıt bulunamadı.",
  [ErrorCode.CONFLICT]: "Çakışma hatası.",
  [ErrorCode.VALIDATION_ERROR]: "Lütfen formu kontrol edin.",
  [ErrorCode.INTERNAL_ERROR]: "Beklenmeyen bir hata oluştu.",
  // Domain-specific
  [ErrorCode.SLUG_TAKEN]: "Bu kısa ad zaten kullanımda.",
  [ErrorCode.RESTAURANT_NOT_FOUND]: "Restoran bulunamadı.",
  [ErrorCode.GO_LIVE_REQUIRES_TABLE]:
    "Yayına almak için en az bir masa eklemelisiniz.",
  [ErrorCode.FLOOR_NAME_TAKEN]: "Bu kat adı zaten kullanımda.",
  [ErrorCode.FLOOR_NOT_FOUND]: "Kat bulunamadı.",
  [ErrorCode.FLOOR_NOT_EMPTY]:
    "Bu katı silmeden önce içindeki bölgeleri kaldırmalısınız.",
  [ErrorCode.AREA_NAME_TAKEN]: "Bu bölge adı zaten kullanımda.",
  [ErrorCode.AREA_NOT_FOUND]: "Bölge bulunamadı.",
  [ErrorCode.AREA_NOT_EMPTY]:
    "Bu bölgeyi silmeden önce içindeki masaları kaldırmalısınız.",
  [ErrorCode.TABLE_LABEL_TAKEN]: "Bu masa adı zaten kullanımda.",
  [ErrorCode.TABLE_NOT_FOUND]: "Masa bulunamadı.",
}

/**
 * Resolves a stable API error code to a localised, user-facing message.
 * Turkish only for now — add locale maps as siblings to `tr` (and a `locale`
 * argument) when EN support lands.
 */
export function getErrorMessage(code: string | undefined): string {
  return (code && tr[code]) ?? "Bir hata oluştu."
}
