import { tenantHost } from "@repo/core"

import { env } from "@/env"

const CUSTOMER_URL = env.NEXT_PUBLIC_CUSTOMER_URL

/**
 * Bare host the diner-facing menu is served under (e.g. "localhost:3002"), for
 * display. This is the customer storefront — the app a table QR resolves to —
 * not the tenant dashboard.
 */
export function rootDomain(): string {
  return CUSTOMER_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

/** Absolute customer-menu URL for a tenant: `<slug>.<root>`. */
export function tenantUrl(slug: string): string {
  const url = new URL(CUSTOMER_URL)
  url.host = tenantHost(url.host, slug)
  return url.toString().replace(/\/$/, "")
}

/**
 * Per-table QR target (`<tenant>/t/<tableId>`), keyed by the immutable table id.
 * Resolves to the customer storefront, whose `proxy.ts` rewrites
 * `<slug>.<root>/t/<id>` → `/s/<slug>/t/<id>`.
 */
export function tableMenuUrl(slug: string, tableId: string): string {
  return `${tenantUrl(slug)}/t/${tableId}`
}
