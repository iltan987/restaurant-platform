import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import type { AuthenticatedRequest, RequestAuth } from "./auth-guard.factory"

/**
 * Injects the authenticated user attached by an audience guard (`req.auth`).
 * Use on routes behind a non-optional guard, where the user is guaranteed to be
 * present (the guard throws otherwise).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestAuth["user"] => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!req.auth) {
      throw new Error("CurrentUser used on a route without an auth guard")
    }
    return req.auth.user
  }
)
