import { tenantLocation, tenantMode } from "@repo/core"

const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL

// "path" mode (e.g. free Vercel staging): the storefront serves tenants at
// <host>/s/<slug>. Default "subdomain" → <slug>.<host> (prod target).
export const TENANT_MODE = tenantMode(process.env.NEXT_PUBLIC_TENANT_MODE)

/**
 * Bare host the diner-facing menu is served under (e.g. "localhost:3002"), for
 * display. This is the customer storefront — the app a table QR resolves to —
 * not the tenant dashboard.
 */
export function rootDomain(): string {
  return (
    CUSTOMER_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "localhost"
  )
}

/**
 * Absolute customer-menu URL for a tenant: `<slug>.<root>` (subdomain mode) or
 * `<root>/s/<slug>` (path mode).
 */
export function tenantUrl(slug: string): string {
  if (!CUSTOMER_URL) return "#"
  try {
    const url = new URL(CUSTOMER_URL)
    const loc = tenantLocation(url.host, slug, TENANT_MODE)
    url.host = loc.host
    url.pathname = loc.path
    return url.toString().replace(/\/$/, "")
  } catch {
    return "#"
  }
}

/**
 * Per-table QR target (`<tenant>/t/<tableId>`), keyed by the immutable table id.
 * Resolves to the customer storefront — in subdomain mode its `proxy.ts` rewrites
 * `<slug>.<root>/t/<id>` → `/s/<slug>/t/<id>`; in path mode the URL is already
 * `<root>/s/<slug>/t/<id>`.
 */
export function tableMenuUrl(slug: string, tableId: string): string {
  const base = tenantUrl(slug)
  return base === "#" ? "#" : `${base}/t/${tableId}`
}

/** Scheme-stripped tenant URL for compact display: `slug.host` | `host/s/slug`. */
export function tenantDisplay(slug: string): string {
  return tenantUrl(slug).replace(/^https?:\/\//, "")
}
