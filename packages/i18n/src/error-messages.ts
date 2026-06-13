import { ErrorCode } from "@repo/schemas"

/**
 * Maps API error codes to Turkish user-facing messages. Typed as a total
 * `Record<ErrorCode, …>` so adding a code to `@repo/schemas` without a message
 * here becomes a compile error — the localisation can't silently drift.
 */
const tr: Record<ErrorCode, string> = {
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
  [ErrorCode.TABLE_LIMIT_REACHED]:
    "Masa sınırına ulaşıldı. Daha fazla masa eklemek için mevcut masaları kaldırın.",
  // Menu domain (feature 003)
  [ErrorCode.CATEGORY_NAME_TAKEN]: "Bu kategori adı zaten kullanımda.",
  [ErrorCode.CATEGORY_NOT_FOUND]: "Kategori bulunamadı.",
  [ErrorCode.CATEGORY_NOT_EMPTY]:
    "Bu kategoriyi silmeden önce içindeki ürünleri kaldırmalısınız.",
  [ErrorCode.MENU_ITEM_NOT_FOUND]: "Ürün bulunamadı.",
  [ErrorCode.ALLERGEN_LABEL_TAKEN]: "Bu alerjen adı zaten kullanımda.",
  [ErrorCode.ALLERGEN_NOT_FOUND]: "Alerjen bulunamadı.",
  [ErrorCode.ALLERGEN_STANDARD_PROTECTED]: "Standart alerjenler silinemez.",
  [ErrorCode.TAG_LABEL_TAKEN]: "Bu etiket adı zaten kullanımda.",
  [ErrorCode.TAG_NOT_FOUND]: "Etiket bulunamadı.",
  [ErrorCode.OPTION_GROUP_NOT_FOUND]: "Seçenek grubu bulunamadı.",
  [ErrorCode.OPTION_NOT_FOUND]: "Seçenek bulunamadı.",
  [ErrorCode.INVALID_OPTION_CONFIG]: "Seçenek yapılandırması geçersiz.",
  [ErrorCode.AVAILABILITY_WINDOW_INVALID]: "Servis saati aralığı geçersiz.",
  [ErrorCode.MEDIA_LIMIT_REACHED]: "Bu ürün için medya sınırına ulaşıldı.",
  [ErrorCode.MEDIA_TYPE_NOT_ALLOWED]: "Bu dosya türü desteklenmiyor.",
  [ErrorCode.MEDIA_TOO_LARGE]: "Dosya boyutu izin verilen sınırı aşıyor.",
  [ErrorCode.MEDIA_OBJECT_NOT_FOUND]: "Yüklenen dosya bulunamadı.",
  // Auth / membership / invitations (feature 004)
  [ErrorCode.INVITATION_NOT_FOUND]: "Davet bulunamadı.",
  [ErrorCode.INVITATION_EXPIRED]: "Bu davetin süresi dolmuş.",
  [ErrorCode.INVITATION_ALREADY_USED]: "Bu davet zaten kullanılmış.",
  [ErrorCode.INVITATION_REVOKED]: "Bu davet iptal edilmiş.",
  [ErrorCode.INVITATION_NOT_PENDING]: "Bu davet artık beklemede değil.",
  [ErrorCode.NOT_A_MEMBER]: "Bu restorana erişim yetkiniz yok.",
  [ErrorCode.INSUFFICIENT_ROLE]: "Bu işlem için yetkiniz yetersiz.",
  [ErrorCode.LAST_OWNER]:
    "Son sahibi kaldıramaz veya yetkisini düşüremezsiniz. Önce başka bir sahip atayın.",
}

/**
 * Resolves a stable API error code to a localised, user-facing message.
 * Turkish only for now — add locale maps as siblings to `tr` (and a `locale`
 * argument) when EN support lands.
 */
export function getErrorMessage(code: string | undefined): string {
  return (code && tr[code as ErrorCode]) ?? "Bir hata oluştu."
}
