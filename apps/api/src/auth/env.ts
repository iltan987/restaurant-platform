/**
 * Centralised auth-related environment reads. Kept lenient on purpose: the
 * Better Auth instances are constructed at module load, which also happens when
 * the schema-generation CLI imports this file — so we never throw here. Better
 * Auth itself enforces a real `secret` at runtime in production.
 */

/** Registrable root domain in prod (e.g. `example.com`); unset in local dev. */
export const rootDomain = process.env.ROOT_DOMAIN || undefined

/** Origin (`scheme://host[:port]`) for a configured app URL, plus optionally
 * its `*.host` tenant-subdomain wildcard. */
function originsFor(
  url: string | undefined,
  withSubdomains: boolean
): string[] {
  if (!url) return []
  try {
    const u = new URL(url)
    const origin = `${u.protocol}//${u.host}`
    return withSubdomains ? [origin, `${u.protocol}//*.${u.host}`] : [origin]
  } catch {
    return []
  }
}

/**
 * CSRF allowlist for all three instances: the admin (apex-only), dashboard and
 * customer (both tenant-facing → also their `*.host` subdomains), plus the prod
 * root-domain wildcard. Mirrors the CORS origins built in `main.ts`.
 */
export const trustedOrigins: string[] = [
  ...originsFor(process.env.ADMIN_URL, false),
  ...originsFor(process.env.DASHBOARD_URL, true),
  ...originsFor(process.env.CUSTOMER_URL, true),
  ...(rootDomain ? [`https://${rootDomain}`, `https://*.${rootDomain}`] : []),
]

/**
 * WebAuthn Relying Party ID for passkeys — the registrable domain a passkey is
 * bound to. Must be a parent of every origin the passkey is used on, so we use
 * the **app root domain**, not the API host (Better Auth would otherwise default
 * to the API hostname, which breaks when the API lives on `api.<root>`).
 *
 * Prod: `ROOT_DOMAIN` (e.g. `example.com`) → works across `<slug>.example.com`.
 * Dev: the given app URL's host (e.g. `192.168.1.41.nip.io`), else `localhost`.
 * WebAuthn needs a secure context, so real testing is on `localhost`/HTTPS.
 */
export function passkeyRpId(appUrl: string | undefined): string {
  if (rootDomain) return rootDomain
  if (appUrl) {
    try {
      return new URL(appUrl).hostname
    } catch {
      /* fall through */
    }
  }
  return "localhost"
}

/** Google OAuth credentials for the customer storefront, if configured. */
export const googleCredentials =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }
    : undefined
