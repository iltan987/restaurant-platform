import { isLocalHost, tenantMode } from "@repo/core"

const CUSTOMER_ROOT = process.env.NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN
if (!CUSTOMER_ROOT)
  throw new Error("NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN is not set")

// "path" mode (e.g. free Vercel staging): tenants live at <host>/s/<slug>.
// Default "subdomain" → <slug>.<host> (prod target).
const TENANT_MODE = tenantMode(process.env.NEXT_PUBLIC_TENANT_MODE)

// Dev hosts aren't served over TLS, so their QR links must use http (localhost,
// LAN IPv4, nip.io / sslip.io, mDNS .local). A real domain gets https.
const PROTOCOL = isLocalHost(CUSTOMER_ROOT) ? "http" : "https"

/**
 * The stable per-table URL a QR code encodes. It targets the **customer**
 * storefront (`<slug>.<root>/t/<tableId>` in subdomain mode, `<root>/s/<slug>/t/<tableId>`
 * in path mode), keyed by the immutable `tableId` — so renaming or moving a table
 * never changes its code (FR-021/FR-022/FR-045).
 */
export function tableQrUrl(slug: string, tableId: string): string {
  return TENANT_MODE === "path"
    ? `${PROTOCOL}://${CUSTOMER_ROOT}/s/${slug}/t/${tableId}`
    : `${PROTOCOL}://${slug}.${CUSTOMER_ROOT}/t/${tableId}`
}
