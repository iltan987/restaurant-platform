/**
 * Multi-tenant URL shape. Tenants are always served at `<slug>.<host>` via
 * wildcard DNS (the production target).
 *
 * Pure helper — callers read the bare host from their own env (this package is
 * precompiled, so Next can't inline `process.env.NEXT_PUBLIC_*` inside it).
 */

/**
 * The host a tenant's storefront resolves to: `<slug>.<host>`, given a bare host
 * (e.g. "localhost:3002" or "ica2.xyz").
 */
export function tenantHost(host: string, slug: string): string {
  return `${slug}.${host}`
}

/**
 * Whether a bare host should be reached over http rather than https: localhost,
 * a bare LAN IPv4, the wildcard-DNS helpers used to reach a dev box from a phone
 * (nip.io / sslip.io), and mDNS (.local). A real domain gets https.
 */
export function isLocalHost(host: string): boolean {
  const h = (host.split(":")[0] ?? "").toLowerCase()
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".nip.io") ||
    h.endsWith(".sslip.io") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
  )
}
