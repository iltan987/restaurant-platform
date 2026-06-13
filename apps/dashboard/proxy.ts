import { type NextRequest, NextResponse } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3001"

function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("host") ?? ""
  const hostname = host.split(":")[0] ?? ""
  const rootHostname = ROOT_DOMAIN.split(":")[0] ?? ""

  // Direct localhost access — no subdomain
  if (hostname === "localhost" || hostname === "127.0.0.1") return null

  // Local development subdomain: <slug>.localhost
  if (hostname.endsWith(".localhost")) return hostname.split(".")[0] ?? null

  // Vercel preview deployments: tenant---branch-name.vercel.app
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    return hostname.split("---")[0] ?? null
  }

  // Production / LAN: subdomain of ROOT_DOMAIN
  const isSubdomain =
    hostname !== rootHostname &&
    hostname !== `www.${rootHostname}` &&
    hostname.endsWith(`.${rootHostname}`)

  return isSubdomain ? hostname.replace(`.${rootHostname}`, "") : null
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const subdomain = extractSubdomain(request)

  if (subdomain) {
    // Rewrite to the internal tenant route — the browser URL stays as the subdomain
    const url = request.nextUrl.clone()
    url.pathname = `/s/${subdomain}${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(url)
  }

  // Apex domain: block direct path access to the internal tenant namespace
  if (pathname.startsWith("/s/")) {
    return NextResponse.rewrite(new URL("/_not-found", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /_next (Next.js internals)
     * 2. /api routes
     * 3. Static files — any path segment containing a dot (e.g. favicon.ico, image.png)
     */
    "/((?!_next|api|[\\w-]+\\.\\w+).*)",
  ],
}
