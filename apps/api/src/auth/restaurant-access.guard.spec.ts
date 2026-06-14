import {
  type ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { ErrorCode } from "@repo/schemas"

import { MembersService } from "../members/members.service"
import { adminAuth, dashboardAuth } from "./instances"
import { IS_PUBLIC_KEY } from "./public.decorator"
import { type PermissionMeta } from "./require-permission.decorator"
import { RestaurantAccessGuard } from "./restaurant-access.guard"
import { ScopeResolvers } from "./scope-resolvers"

// adminAuth and dashboardAuth get distinct `api` objects from the better-auth
// mock, so each getSession can be spied independently (the mock itself returns
// one shared session for both — useless for testing the two audiences apart).
const adminGetSession = jest.spyOn(
  adminAuth.api,
  "getSession"
) as unknown as jest.Mock
const dashGetSession = jest.spyOn(
  dashboardAuth.api,
  "getSession"
) as unknown as jest.Mock

const DASH_USER = { id: "u1", email: "owner@example.com" }
const dashSession = { session: { id: "s" }, user: DASH_USER }
const adminSession = {
  session: { id: "s" },
  user: { id: "a1", email: "admin@example.com" },
}

describe("RestaurantAccessGuard", () => {
  let guard: RestaurantAccessGuard
  let members: { requirePermission: jest.Mock }
  let reflector: { getAllAndOverride: jest.Mock }
  let req: {
    headers: Record<string, string>
    params: Record<string, string>
    auth?: unknown
  }

  // The resolver always yields the same restaurant id for these tests.
  const meta: PermissionMeta = {
    action: "menu:manage",
    resolve: async () => "rest-1",
  }

  function context(): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => () => undefined,
      getClass: () => class {},
    } as unknown as ExecutionContext
  }

  /** Make the reflector return given values for the two metadata keys. */
  function setMeta(opts: {
    isPublic?: boolean
    permission?: PermissionMeta | undefined
  }) {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === IS_PUBLIC_KEY ? opts.isPublic : opts.permission
    )
  }

  beforeEach(() => {
    adminGetSession.mockReset()
    dashGetSession.mockReset()
    members = { requirePermission: jest.fn() }
    reflector = { getAllAndOverride: jest.fn() }
    req = { headers: {}, params: {} }
    guard = new RestaurantAccessGuard(
      reflector as unknown as Reflector,
      members as unknown as MembersService,
      {} as ScopeResolvers
    )
  })

  it("lets @Public routes through without touching sessions", async () => {
    setMeta({ isPublic: true })
    await expect(guard.canActivate(context())).resolves.toBe(true)
    expect(adminGetSession).not.toHaveBeenCalled()
  })

  it("admits a platform admin and bypasses the permission check", async () => {
    setMeta({ permission: meta })
    adminGetSession.mockResolvedValue(adminSession)

    await expect(guard.canActivate(context())).resolves.toBe(true)
    expect(req.auth).toMatchObject({ isAdmin: true })
    expect(members.requirePermission).not.toHaveBeenCalled()
    expect(dashGetSession).not.toHaveBeenCalled()
  })

  it("rejects an unauthenticated request with 401", async () => {
    setMeta({ permission: meta })
    adminGetSession.mockResolvedValue(null)
    dashGetSession.mockResolvedValue(null)

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException
    )
  })

  it("treats a route with no @RequirePermission as admin-only (403 for dashboard)", async () => {
    setMeta({ permission: undefined })
    adminGetSession.mockResolvedValue(null)
    dashGetSession.mockResolvedValue(dashSession)

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException
    )
    expect(members.requirePermission).not.toHaveBeenCalled()
  })

  it("admits a dashboard member with the required permission", async () => {
    setMeta({ permission: meta })
    adminGetSession.mockResolvedValue(null)
    dashGetSession.mockResolvedValue(dashSession)
    members.requirePermission.mockResolvedValue({ role: "OWNER" })

    await expect(guard.canActivate(context())).resolves.toBe(true)
    expect(req.auth).toMatchObject({ isAdmin: false })
    expect(members.requirePermission).toHaveBeenCalledWith(
      "rest-1",
      DASH_USER.id,
      "menu:manage"
    )
  })

  it("maps a non-member (NOT_A_MEMBER) to 404, not 403 (no cross-tenant enumeration)", async () => {
    setMeta({ permission: meta })
    adminGetSession.mockResolvedValue(null)
    dashGetSession.mockResolvedValue(dashSession)
    members.requirePermission.mockRejectedValue(
      new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "no",
      })
    )

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      NotFoundException
    )
  })

  it("propagates INSUFFICIENT_ROLE as 403", async () => {
    setMeta({ permission: meta })
    adminGetSession.mockResolvedValue(null)
    dashGetSession.mockResolvedValue(dashSession)
    members.requirePermission.mockRejectedValue(
      new ForbiddenException({
        code: ErrorCode.INSUFFICIENT_ROLE,
        message: "no",
      })
    )

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException
    )
  })
})
