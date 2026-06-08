const CUSTOMER_ROOT = process.env.NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN
if (!CUSTOMER_ROOT)
  throw new Error("NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN is not set")

// Local dev (localhost / *.localhost / bare IP) isn't served over TLS.
const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(CUSTOMER_ROOT)
const PROTOCOL = isLocal ? "http" : "https"

/**
 * The stable per-table URL a QR code encodes. It targets the **customer**
 * storefront subdomain (`<slug>.<root>/t/<tableId>`), keyed by the immutable
 * `tableId` — so renaming or moving a table never changes its code
 * (FR-021/FR-022/FR-045).
 */
export function tableQrUrl(slug: string, tableId: string): string {
  return `${PROTOCOL}://${slug}.${CUSTOMER_ROOT}/t/${tableId}`
}
