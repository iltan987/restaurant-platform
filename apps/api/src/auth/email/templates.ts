import type { EmailMessage } from "./email.types"

/**
 * Passwordless customer sign-in email. A single message can carry BOTH a magic
 * link and a one-time code — either completes sign-in (research D6). Each is
 * optional so the same helper renders whichever the caller has on hand; the
 * customer instance (T040) merges the two plugin callbacks into one send that
 * passes both.
 */
export function renderPasswordlessEmail(opts: {
  link?: string
  code?: string
}): Omit<EmailMessage, "to"> {
  const { link, code } = opts
  const lines: string[] = ["Giriş yapmak için:"]
  if (link) lines.push("", `Bağlantıya tıklayın: ${link}`)
  if (code) lines.push("", `veya bu kodu girin: ${code}`)
  lines.push("", "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.")

  const html = [
    "<p>Giriş yapmak için:</p>",
    link ? `<p><a href="${link}">Giriş bağlantısı</a></p>` : "",
    code ? `<p>veya bu kodu girin: <strong>${code}</strong></p>` : "",
    "<p>Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>",
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: "Giriş bağlantınız", text: lines.join("\n"), html }
}

/**
 * Owner/member invitation email. Carries the acceptance link (our single-use
 * token) and, for the recipient's convenience, the same token as a short code.
 * Used by the invitations service (US2, T024).
 */
export function renderInvitationEmail(opts: {
  restaurantName: string
  link: string
}): Omit<EmailMessage, "to"> {
  const { restaurantName, link } = opts
  const text = [
    `${restaurantName} restoranına davet edildiniz.`,
    "",
    `Daveti kabul etmek için: ${link}`,
    "",
    "Bu bağlantı tek kullanımlıktır ve bir süre sonra geçersiz olur.",
  ].join("\n")

  const html = [
    `<p><strong>${restaurantName}</strong> restoranına davet edildiniz.</p>`,
    `<p><a href="${link}">Daveti kabul et</a></p>`,
    "<p>Bu bağlantı tek kullanımlıktır ve bir süre sonra geçersiz olur.</p>",
  ].join("\n")

  return { subject: `${restaurantName} — davet`, text, html }
}
