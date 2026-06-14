import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { fromNodeHeaders } from "better-auth/node"

import { ErrorCode } from "@repo/schemas"

import { MembersService } from "../members/members.service"
import { type AuthenticatedRequest } from "./auth-guard.factory"
import { adminAuth, dashboardAuth } from "./instances"
import { IS_PUBLIC_KEY } from "./public.decorator"
import {
  type PermissionMeta,
  REQUIRE_PERMISSION_KEY,
} from "./require-permission.decorator"
import { ScopeResolvers } from "./scope-resolvers"

/**
 * Dual-audience guard for restaurant-scoped resource controllers. Grants access
 * to EITHER a platform admin (any restaurant — unchanged from the old
 * AdminAuthGuard) OR a dashboard member with the route's `@RequirePermission`
 * on the restaurant the route resolves to.
 *
 * - `@Public()` routes pass through (storefront reads).
 * - Admin session → full bypass (one getSession call; no admin-app regression).
 * - Dashboard session → must carry `@RequirePermission`; the restaurant is
 *   resolved server-side and `MembersService.requirePermission` is enforced.
 * - A route WITHOUT `@RequirePermission` is admin-only (dashboard users 403).
 * - No session at all → 401. A non-member hitting another tenant's resource
 *   gets 404 (not 403) so ids can't be enumerated across tenants.
 */
@Injectable()
export class RestaurantAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly members: MembersService,
    private readonly resolvers: ScopeResolvers
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const headers = fromNodeHeaders(req.headers)

    // Platform admin: full access to any restaurant (as before).
    const admin = await adminAuth.api.getSession({ headers })
    if (admin) {
      req.auth = { ...admin, isAdmin: true }
      return true
    }

    // Otherwise the caller must be a dashboard user (owner/manager/staff).
    const dash = await dashboardAuth.api.getSession({ headers })
    if (!dash) throw new UnauthorizedException("Authentication required")
    req.auth = { ...dash, isAdmin: false }

    // Fail closed: a route reachable by dashboard users must declare what it
    // needs. Routes without it (fleet/billing) are thereby admin-only.
    const meta = this.reflector.getAllAndOverride<PermissionMeta>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    )
    if (!meta) {
      throw new ForbiddenException({
        code: ErrorCode.INSUFFICIENT_ROLE,
        message: "This action is restricted to platform admins",
      })
    }

    const restaurantId = await meta.resolve(req, this.resolvers)
    try {
      await this.members.requirePermission(
        restaurantId,
        dash.user.id,
        meta.action
      )
    } catch (err) {
      // Don't leak another tenant's resources: a non-member sees 404, not 403.
      if (
        err instanceof ForbiddenException &&
        (err.getResponse() as { code?: string })?.code ===
          ErrorCode.NOT_A_MEMBER
      ) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: "Not found",
        })
      }
      throw err
    }
    return true
  }
}
