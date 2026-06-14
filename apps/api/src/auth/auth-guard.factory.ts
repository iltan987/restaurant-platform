import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  mixin,
  type Type,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { fromNodeHeaders } from "better-auth/node"
import type { Request } from "express"

import { adminAuth, customerAuth, dashboardAuth } from "./instances"
import { IS_PUBLIC_KEY } from "./public.decorator"

/** The session Better Auth resolves for a request (no audience discriminator). */
export type ResolvedSession = {
  session: unknown
  user: { id: string; email: string; [key: string]: unknown }
}

/** What a guard attaches to `req.auth`: the resolved session plus whether the
 * caller is a platform admin (admins bypass per-restaurant permission checks). */
export type RequestAuth = ResolvedSession & { isAdmin: boolean }

/** Express request augmented with the resolved auth context (when present). */
export type AuthenticatedRequest = Request & { auth?: RequestAuth }

type SessionReader = {
  api: {
    getSession: (args: {
      headers: Headers
    }) => Promise<ResolvedSession | null | undefined>
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
  options: { optional?: boolean; isAdmin?: boolean } = {}
): Type<CanActivate> {
  @Injectable()
  class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      // Routes marked @Public() bypass the guard even at controller scope.
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()]
      )
      if (isPublic) return true

      const req = context.switchToHttp().getRequest<AuthenticatedRequest>()

      const result = await instance.api.getSession({
        headers: fromNodeHeaders(req.headers),
      })

      if (result) req.auth = { ...result, isAdmin: options.isAdmin ?? false }
      if (options.optional) return true
      if (!result) throw new UnauthorizedException("Authentication required")
      return true
    }
  }

  return mixin(AuthGuard)
}

/** Guards bound to each audience. Customer is optional (non-gating). */
export const AdminAuthGuard = createAuthGuard(adminAuth, { isAdmin: true })
export const DashboardAuthGuard = createAuthGuard(dashboardAuth)
export const CustomerAuthGuard = createAuthGuard(customerAuth, {
  optional: true,
})
