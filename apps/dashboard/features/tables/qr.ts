const CUSTOMER_ROOT = process.env.NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN
if (!CUSTOMER_ROOT)
  throw new Error("NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN is not set")

// Dev hosts aren't served over TLS, so their QR links must use http: localhost,
// a bare LAN IPv4, the wildcard-DNS helpers used to reach a dev box from a phone
// (nip.io / sslip.io), and mDNS (.local). A real domain gets https.
const rootHost = (CUSTOMER_ROOT.split(":")[0] ?? "").toLowerCase()
const isLocal =
  rootHost === "localhost" ||
  rootHost.endsWith(".localhost") ||
  rootHost.endsWith(".local") ||
  rootHost.endsWith(".nip.io") ||
  rootHost.endsWith(".sslip.io") ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(rootHost)
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
