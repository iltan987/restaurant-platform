const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL

/** Bare host the tenants are served under (e.g. "localhost:3001"), for display. */
export function rootDomain(): string {
  return (
    DASHBOARD_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "localhost"
  )
}

/** Absolute customer-menu URL for a tenant: `<slug>.<root>`. */
export function tenantUrl(slug: string): string {
  if (!DASHBOARD_URL) return "#"
  try {
    const url = new URL(DASHBOARD_URL)
    url.hostname = `${slug}.${url.hostname}`
    return url.toString().replace(/\/$/, "")
  } catch {
    return "#"
  }
}

/**
 * Preview of the per-table QR target (`<tenant>/t/<tableId>`), keyed by the
 * immutable table id. The dashboard owns authoritative QR generation/printing;
 * this is just what the admin console previews.
 */
export function tableMenuUrl(slug: string, tableId: string): string {
  const base = tenantUrl(slug)
  return base === "#" ? "#" : `${base}/t/${tableId}`
}
