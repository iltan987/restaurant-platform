/**
 * Turkish message for a passkey *registration* failure. `addPasskey` surfaces
 * either a SimpleWebAuthn ceremony code (client-side, `ERROR_*`) or a Better
 * Auth server code (e.g. `CHALLENGE_NOT_FOUND`) — both are handled. The generic
 * fallback covers unknown/`UNKNOWN_ERROR` codes. Log the raw error alongside
 * this so the exact code stays visible for debugging.
 */
export function passkeyAddErrorMessage(code?: string): string {
  switch (code) {
    case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
      return "Bu cihazda zaten bir geçiş anahtarı var."
    case "ERROR_CEREMONY_ABORTED":
    case "AUTH_CANCELLED":
    case "REGISTRATION_CANCELLED":
      return "İşlem iptal edildi."
    case "CHALLENGE_NOT_FOUND":
      return "Oturum doğrulaması bulunamadı. Sayfayı yenileyip tekrar deneyin."
    case "FAILED_TO_VERIFY_REGISTRATION":
      return "Geçiş anahtarı doğrulanamadı."
    default:
      return "Geçiş anahtarı eklenemedi."
  }
}
