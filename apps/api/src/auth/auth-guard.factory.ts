import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  mixin,
  type Type,
  UnauthorizedException,
} from "@nestjs/common"
import { fromNodeHeaders } from "better-auth/node"
import type { Request } from "express"

import { adminAuth, customerAuth, dashboardAuth } from "./instances"

/** The `{ session, user }` Better Auth resolves for a request, attached by the
 * guard so controllers/handlers can read the authenticated identity. */
export type RequestAuth = {
  session: unknown
  user: { id: string; email: string; [key: string]: unknown }
}

/** Express request augmented with the resolved auth context (when present). */
export type AuthenticatedRequest = Request & { auth?: RequestAuth }

type SessionReader = {
  api: {
    getSession: (args: {
      headers: Headers
    }) => Promise<RequestAuth | null | undefined>
  }
}

/**
 * Builds a NestJS guard bound to one specific Better Auth instance — validating
 * against that audience's cookie only, so a session from another instance can
 * never authorize here (research D3). On success it attaches `{ session, user }`
 * to `req.auth`.
 *
 * `optional: true` makes the guard non-throwing (always allows through) — used
 * for the customer audience, whose sign-in is non-gating; downstream code reads
 * `req.auth` when present.
 */
export function createAuthGuard(
  instance: SessionReader,
  options: { optional?: boolean } = {}
): Type<CanActivate> {
  @Injectable()
  class AuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest<AuthenticatedRequest>()

      const result = await instance.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })

      if (result) req.auth = result
      if (options.optional) return true
      if (!result) throw new UnauthorizedException("Authentication required")
      return true
    }
  }

  return mixin(AuthGuard)
}

/** Guards bound to each audience. Customer is optional (non-gating). */
export const AdminAuthGuard = createAuthGuard(adminAuth)
export const DashboardAuthGuard = createAuthGuard(dashboardAuth)
export const CustomerAuthGuard = createAuthGuard(customerAuth, {
  optional: true,
})
