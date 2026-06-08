import { type NextRequest, NextResponse } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3002"

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url
  const host = request.headers.get("host") ?? ""
  const hostname = host.split(":")[0] ?? ""
  const rootHostname = ROOT_DOMAIN.split(":")[0] ?? ""

  // Local development — match against the full URL for reliability
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const match = url.match(/https?:\/\/([^.]+)\.localhost/)
    if (match?.[1]) return match[1]

    // Fallback: host header
    if (hostname.includes(".localhost")) return hostname.split(".")[0] ?? null

    return null
  }

  // Vercel preview deployments: tenant---branch-name.vercel.app
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    return hostname.split("---")[0] ?? null
  }

  // Production: regular subdomain of ROOT_DOMAIN
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
