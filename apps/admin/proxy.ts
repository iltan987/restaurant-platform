import { getSessionCookie } from "better-auth/cookies"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Optimistic route protection for the admin console. Checks only for the
 * presence of the admin session cookie (`pa.*`) and redirects to `/sign-in`
 * when it's missing — fast, no API/DB call. This is NOT a security boundary:
 * every data request is still validated server-side by `AdminAuthGuard`, which
 * rejects forged or expired cookies (Better Auth Next.js guidance).
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, { cookiePrefix: "pa" })

  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Everything except Next internals, API routes, the sign-in page itself, and
  // static files (any segment with a dot).
  matcher: ["/((?!_next|api|sign-in|[\\w-]+\\.\\w+).*)"],
}
