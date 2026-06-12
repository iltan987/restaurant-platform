/**
 * Multi-tenant URL shape. Two deployment modes:
 * - "subdomain" (default): tenants are served at `<slug>.<host>` (prod / local
 *   wildcard DNS). This is the production target.
 * - "path": tenants are served at `<host>/s/<slug>` on a single host. Used for
 *   free staging (e.g. Vercel) where wildcard subdomains aren't available.
 *
 * These helpers are pure — callers read `NEXT_PUBLIC_TENANT_MODE` themselves and
 * pass the resolved mode/host in (this package is precompiled, so Next can't
 * inline `process.env.NEXT_PUBLIC_*` inside it).
 */
export type TenantMode = "subdomain" | "path"

/** Normalize a raw env value to a TenantMode. Anything but "path" → "subdomain". */
export function tenantMode(raw: string | undefined): TenantMode {
  return raw === "path" ? "path" : "subdomain"
}

/**
 * Where a tenant's storefront resolves, given a bare host (e.g. "localhost:3002"
 * or "x.vercel.app"), a slug, and the mode:
 * - subdomain → `{ host: "<slug>.<host>", path: "" }`
 * - path      → `{ host, path: "/s/<slug>" }`
 */
export function tenantLocation(
  host: string,
  slug: string,
  mode: TenantMode
): { host: string; path: string } {
  return mode === "path"
    ? { host, path: `/s/${slug}` }
    : { host: `${slug}.${host}`, path: "" }
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
