import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { __resetAuthMock, __setSession } from "./better-auth.mock"

/**
 * Team & roles (US3) end-to-end through the real HTTP stack: routing, the REAL
 * `DashboardAuthGuard`, membership-scoped authorization, the role→permission
 * map, the last-owner invariant, and multi-restaurant isolation (FR-012–016).
 *
 * Prisma is a focused in-memory fake covering the membership delegates; the
 * invitation email is stubbed so no transport runs.
 */

jest.mock("../src/auth/email", () => {
  const actual = jest.requireActual("../src/auth/email")
  return { ...actual, getEmailSender: () => ({ send: async () => {} }) }
})

type Row = Record<string, unknown>

const db = {
  restaurants: [] as Row[],
  invitations: [] as Row[],
  members: [] as Row[],
  dashUsers: [] as Row[],
}
let seq = 0
const nextId = (p: string) => `${p}${++seq}`
const stamp = () => new Date(1_700_000_000_000 + ++seq * 1000)
const eq = (row: Row, w: Row) =>
  Object.entries(w).every(([k, v]) => row[k] === v)

const prismaMock = {
  restaurant: {
    findUnique: async ({ where: w }: { where: Row }) =>
      db.restaurants.find((r) => r.id === w.id || r.slug === w.slug) ?? null,
  },
  restaurantInvitation: {
    create: async ({ data }: { data: Row }) => {
      const row: Row = {
        id: nextId("inv"),
        status: "PENDING",
        acceptedAt: null,
        createdAt: stamp(),
        ...data,
      }
      db.invitations.push(row)
      return row
    },
    updateMany: async ({ where: w, data }: { where: Row; data: Row }) => {
      let count = 0
      for (const i of db.invitations)
        if (eq(i, w)) {
          Object.assign(i, data)
          count++
        }
      return { count }
    },
  },
  restaurantMember: {
    findUnique: async ({ where: w }: { where: Row }) => {
      const k = w.restaurantId_userId as Row
      return (
        db.members.find(
          (m) => m.restaurantId === k.restaurantId && m.userId === k.userId
        ) ?? null
      )
    },
    findMany: async ({
      where: w,
      include,
    }: {
      where: Row
      orderBy?: Row
      include?: Row
    }) => {
      const rows = db.members
        .filter((m) => eq(m, w))
        .sort(
          (a, b) =>
            (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()
        )
      if (include?.restaurant) {
        return rows.map((m) => ({
          ...m,
          restaurant: db.restaurants.find((r) => r.id === m.restaurantId),
        }))
      }
      return rows
    },
    count: async ({ where: w }: { where: Row }) =>
      db.members.filter((m) => eq(m, w)).length,
    update: async ({ where: w, data }: { where: Row; data: Row }) => {
      const k = w.restaurantId_userId as Row
      const m = db.members.find(
        (x) => x.restaurantId === k.restaurantId && x.userId === k.userId
      )!
      Object.assign(m, data)
      return m
    },
    delete: async ({ where: w }: { where: Row }) => {
      const k = w.restaurantId_userId as Row
      const idx = db.members.findIndex(
        (x) => x.restaurantId === k.restaurantId && x.userId === k.userId
      )
      const [removed] = db.members.splice(idx, 1)
      return removed
    },
  },
  dashUser: {
    findUnique: async ({ where: w }: { where: Row }) =>
      db.dashUsers.find((u) => u.email === w.email || u.id === w.id) ?? null,
    findMany: async ({ where: w }: { where: Row }) => {
      const ids = (w.id as { in: string[] }).in
      return db.dashUsers.filter((u) => ids.includes(u.id as string))
    },
  },
}

describe("Members & roles (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const asUser = (id: string, email: string) =>
    __setSession({ session: { id: "s1" }, user: { id, email } })

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    await app.init()
  })

  beforeEach(() => {
    seq = 0
    db.restaurants = [
      { id: "r1", name: "Alpha", slug: "alpha" },
      { id: "r2", name: "Beta", slug: "beta" },
    ]
    db.invitations = []
    db.dashUsers = [
      { id: "u-owner", email: "owner@a.com" },
      { id: "u-mgr", email: "mgr@a.com" },
      { id: "u-staff", email: "staff@a.com" },
      { id: "u-other", email: "other@b.com" },
    ]
    // u-owner belongs to BOTH restaurants (drives the switching/isolation tests).
    db.members = [
      {
        id: "m1",
        restaurantId: "r1",
        userId: "u-owner",
        role: "OWNER",
        createdAt: stamp(),
      },
      {
        id: "m2",
        restaurantId: "r1",
        userId: "u-mgr",
        role: "MANAGER",
        createdAt: stamp(),
      },
      {
        id: "m3",
        restaurantId: "r1",
        userId: "u-staff",
        role: "STAFF",
        createdAt: stamp(),
      },
      {
        id: "m4",
        restaurantId: "r2",
        userId: "u-other",
        role: "OWNER",
        createdAt: stamp(),
      },
      {
        id: "m5",
        restaurantId: "r2",
        userId: "u-owner",
        role: "MANAGER",
        createdAt: stamp(),
      },
    ]
    __resetAuthMock()
  })

  afterAll(async () => app.close())

  describe("authorization & isolation", () => {
    it("rejects an unauthenticated request (401)", async () => {
      await request(http()).get("/api/restaurants/r1/members").expect(401)
    })

    it("denies a non-member of the target restaurant (NOT_A_MEMBER) — SC-003", async () => {
      asUser("u-staff", "staff@a.com") // member of r1 only
      const res = await request(http())
        .get("/api/restaurants/r2/members")
        .expect(403)
      expect(res.body.code).toBe(ErrorCode.NOT_A_MEMBER)
    })

    it("lists members + roles for a member of the restaurant", async () => {
      asUser("u-mgr", "mgr@a.com")
      const res = await request(http())
        .get("/api/restaurants/r1/members")
        .expect(200)
      expect(res.body.members).toEqual([
        { userId: "u-owner", email: "owner@a.com", role: "OWNER" },
        { userId: "u-mgr", email: "mgr@a.com", role: "MANAGER" },
        { userId: "u-staff", email: "staff@a.com", role: "STAFF" },
      ])
    })

    it("scopes /me/restaurants to the caller's own memberships", async () => {
      asUser("u-owner", "owner@a.com")
      const both = await request(http()).get("/api/me/restaurants").expect(200)
      expect(
        both.body.memberships.map((m: { slug: string }) => m.slug)
      ).toEqual(["alpha", "beta"])

      asUser("u-staff", "staff@a.com")
      const one = await request(http()).get("/api/me/restaurants").expect(200)
      expect(one.body.memberships).toHaveLength(1)
      expect(one.body.memberships[0].slug).toBe("alpha")
    })
  })

  describe("inviting members (owner-only)", () => {
    it("lets an owner invite a member with a role, attributed to them", async () => {
      asUser("u-owner", "owner@a.com")
      const res = await request(http())
        .post("/api/restaurants/r1/members/invitations")
        .send({ email: "New@A.com", role: "STAFF" })
        .expect(201)
      expect(res.body.invitation).toMatchObject({
        role: "STAFF",
        status: "PENDING",
      })
      expect(db.invitations[0]).toMatchObject({
        email: "new@a.com",
        role: "STAFF",
        invitedByAdmin: false,
        invitedByUserId: "u-owner",
      })
    })

    it("forbids a STAFF member from inviting (INSUFFICIENT_ROLE)", async () => {
      asUser("u-staff", "staff@a.com")
      const res = await request(http())
        .post("/api/restaurants/r1/members/invitations")
        .send({ email: "new@a.com", role: "STAFF" })
        .expect(403)
      expect(res.body.code).toBe(ErrorCode.INSUFFICIENT_ROLE)
    })

    it("rejects an invalid role (400)", async () => {
      asUser("u-owner", "owner@a.com")
      await request(http())
        .post("/api/restaurants/r1/members/invitations")
        .send({ email: "new@a.com", role: "ADMIN" })
        .expect(400)
    })
  })

  describe("changing roles", () => {
    it("lets an owner change a member's role", async () => {
      asUser("u-owner", "owner@a.com")
      const res = await request(http())
        .patch("/api/restaurants/r1/members/u-mgr")
        .send({ role: "STAFF" })
        .expect(200)
      expect(res.body.member).toMatchObject({ userId: "u-mgr", role: "STAFF" })
    })

    it("forbids a manager from changing roles (INSUFFICIENT_ROLE)", async () => {
      asUser("u-mgr", "mgr@a.com")
      const res = await request(http())
        .patch("/api/restaurants/r1/members/u-staff")
        .send({ role: "MANAGER" })
        .expect(403)
      expect(res.body.code).toBe(ErrorCode.INSUFFICIENT_ROLE)
    })

    it("refuses to demote the last owner (LAST_OWNER)", async () => {
      asUser("u-owner", "owner@a.com") // sole OWNER of r1
      const res = await request(http())
        .patch("/api/restaurants/r1/members/u-owner")
        .send({ role: "MANAGER" })
        .expect(403)
      expect(res.body.code).toBe(ErrorCode.LAST_OWNER)
    })
  })

  describe("removing members", () => {
    it("lets an owner remove a member", async () => {
      asUser("u-owner", "owner@a.com")
      await request(http())
        .delete("/api/restaurants/r1/members/u-staff")
        .expect(204)
      expect(db.members.find((m) => m.userId === "u-staff")).toBeUndefined()
    })

    it("refuses to remove the last owner (LAST_OWNER)", async () => {
      asUser("u-owner", "owner@a.com")
      const res = await request(http())
        .delete("/api/restaurants/r1/members/u-owner")
        .expect(403)
      expect(res.body.code).toBe(ErrorCode.LAST_OWNER)
    })
  })
})
