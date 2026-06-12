import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { __resetAuthMock, __setSession } from "./better-auth.mock"
import { fakePrisma } from "./fake-prisma"

/**
 * Admin authorization boundary (US1, SC-001 / FR-002 / FR-011).
 *
 * Exercises the REAL `AdminAuthGuard` against a controllable session
 * (`__setSession`) — proving guarded admin routes reject the unauthenticated
 * and admit a valid admin session, while `@Public()` storefront reads stay open.
 *
 * Better Auth's own endpoint behaviors — sign-in, sign-out, brute-force
 * throttling (SC-007) and the no-account-enumeration response (FR-026) — are
 * configured on the admin instance and verified against a live server (the
 * package is ESM-only and can't run under Jest's CommonJS loader, so it is
 * mocked here; see test/better-auth.mock.ts).
 */
describe("Admin auth (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

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
    __resetAuthMock() // session → null (unauthenticated)
  })
  afterAll(async () => app.close())

  describe("unauthenticated", () => {
    it("rejects a guarded admin read with 401", async () => {
      await request(http()).get("/api/restaurants").expect(401)
    })

    it("rejects a guarded admin mutation with 401", async () => {
      await request(http())
        .post("/api/restaurants")
        .send({ name: "Nope" })
        .expect(401)
    })

    it("leaves the public restaurant lookup open (404, not 401)", async () => {
      await request(http()).get("/api/restaurants/ghost-slug").expect(404)
    })

    it("leaves the public menu route open (404, not 401)", async () => {
      await request(http()).get("/api/menu/by-slug/ghost-slug").expect(404)
    })
  })

  describe("authenticated admin", () => {
    beforeEach(() => {
      __setSession({
        session: { id: "s1" },
        user: { id: "admin-1", email: "admin@example.com" },
      })
    })

    it("admits a valid admin session to a guarded route", async () => {
      const res = await request(http()).get("/api/restaurants").expect(200)
      expect(res.body).toMatchObject({ total: 0, items: [] })
    })

    it("admits a guarded mutation and performs it", async () => {
      const res = await request(http())
        .post("/api/restaurants")
        .send({ name: "Authed Restaurant" })
        .expect(201)
      expect(res.body).toMatchObject({ slug: "authed-restaurant" })
    })
  })
})
