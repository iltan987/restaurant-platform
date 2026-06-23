import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AppModule } from "../src/app.module"
import { adminAuth, dashboardAuth } from "../src/auth/instances"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

/**
 * Cross-audience isolation (SC-006 / FR-021–022).
 *
 * Proves that a session from one audience cannot authorize routes protected
 * by a different audience's guard. The structural guarantee comes from each
 * instance reading its own cookie prefix (`pa` / `dash` / `cust`) — Better
 * Auth never returns a session for the wrong instance at runtime. Here we
 * make that contract observable at the guard layer by controlling each
 * instance's `getSession` independently via `jest.spyOn`.
 *
 * Three instances × two route types:
 *   - Admin-only via `RestaurantAccessGuard` (no `@RequirePermission`) —
 *     admin session is admitted; dashboard session is denied.
 *   - Dashboard-only via `DashboardAuthGuard` — dashboard session is
 *     admitted; admin session is denied (401).
 */
describe("Audience isolation (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  // Minimal sessions — the guards only read session.id and user.{id,email}.
  // Cast to Better Auth's full getSession return shape (both instances share it).
  type SessionResult = Awaited<ReturnType<typeof adminAuth.api.getSession>>
  const adminSession = {
    session: { id: "s-admin" },
    user: { id: "admin-1", email: "admin@example.com" },
  } as SessionResult
  const dashSession = {
    session: { id: "s-dash" },
    user: { id: "dash-1", email: "owner@example.com" },
  } as SessionResult

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    await app.init()
  })

  beforeEach(() => {
    fakePrisma.__reset()
    // Default: both instances return null (unauthenticated).
    jest.spyOn(adminAuth.api, "getSession").mockResolvedValue(null)
    jest.spyOn(dashboardAuth.api, "getSession").mockResolvedValue(null)
  })

  afterEach(() => jest.restoreAllMocks())
  afterAll(async () => app.close())

  describe("admin session", () => {
    beforeEach(() => {
      jest.spyOn(adminAuth.api, "getSession").mockResolvedValue(adminSession)
      // dashboardAuth still returns null — this is the isolation proof.
    })

    it("is admitted by the admin-only route (200)", async () => {
      const res = await request(http()).get("/api/restaurants").expect(200)
      expect(res.body).toMatchObject({ total: 0, items: [] })
    })

    it("is rejected by the dashboard-only route (401)", async () => {
      await request(http()).get("/api/me/restaurants").expect(401)
    })
  })

  describe("dashboard session", () => {
    beforeEach(() => {
      jest.spyOn(dashboardAuth.api, "getSession").mockResolvedValue(dashSession)
      // adminAuth still returns null — this is the isolation proof.
    })

    it("is rejected by the admin-only route (403, not 200 — no admin bypass)", async () => {
      // DashboardAuthGuard route with no @RequirePermission is admin-only.
      // The dashboard user is let in as far as `RestaurantAccessGuard`'s
      // dashboard branch, which then 403s because there is no permission
      // metadata — proving the admin bypass was NOT triggered.
      const res = await request(http()).get("/api/restaurants").expect(403)
      expect(res.body.code).toBe("INSUFFICIENT_ROLE")
    })

    it("is admitted by the dashboard-only route (200)", async () => {
      const res = await request(http()).get("/api/me/restaurants").expect(200)
      expect(res.body).toMatchObject({ memberships: [] })
    })
  })

  describe("no session", () => {
    it("is rejected by the admin-only route (401)", async () => {
      await request(http()).get("/api/restaurants").expect(401)
    })

    it("is rejected by the dashboard-only route (401)", async () => {
      await request(http()).get("/api/me/restaurants").expect(401)
    })
  })
})
