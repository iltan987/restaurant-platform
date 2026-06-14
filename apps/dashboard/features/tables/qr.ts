import { isLocalHost } from "@repo/core"

import { env } from "@/env"

const CUSTOMER_ROOT = env.NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN

// Dev hosts aren't served over TLS, so their QR links must use http (localhost,
// LAN IPv4, nip.io / sslip.io, mDNS .local). A real domain gets https.
const PROTOCOL = isLocalHost(CUSTOMER_ROOT) ? "http" : "https"

/**
 * The stable per-table URL a QR code encodes. It targets the **customer**
 * storefront (`<slug>.<root>/t/<tableId>`), keyed by the immutable `tableId` — so
 * renaming or moving a table never changes its code (FR-021/FR-022/FR-045).
 */
export function tableQrUrl(slug: string, tableId: string): string {
  return `${PROTOCOL}://${slug}.${CUSTOMER_ROOT}/t/${tableId}`
}
