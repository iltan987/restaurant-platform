import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { __resetAuthMock, __setSession, signUpEmail } from "./better-auth.mock"

/**
 * Invitation lifecycle (US2) end-to-end through the real HTTP stack: routing,
 * the REAL `AdminAuthGuard` on the admin surface (guarded), the public token
 * surface (open), Zod validation, and `HttpExceptionFilter` error-code
 * normalization.
 *
 * Prisma is a focused in-memory fake (the invitation/membership delegates the
 * shared `fake-prisma` doesn't model), and the dashboard sign-up call is the
 * Better Auth mock — wired so `signUpEmail` actually materializes a `dash_user`,
 * mirroring the real adapter. The accept flow round-trips a REAL token captured
 * from the rendered invitation link.
 */

// Capture the raw token from the emailed accept link; stub the sender so no
// real transport (SMTP/console) runs. Must be `mock`-prefixed for jest.mock.
const mockEmail = { lastLink: "" }
jest.mock("../src/auth/email", () => {
  const actual = jest.requireActual("../src/auth/email")
  return {
    ...actual,
    getEmailSender: () => ({ send: async () => {} }),
    renderInvitationEmail: async (args: {
      restaurantName: string
      link: string
    }) => {
      mockEmail.lastLink = args.link
      return { subject: "", text: "", html: "" }
    },
  }
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
// Strictly increasing timestamps so `orderBy createdAt desc` is deterministic.
const stamp = () => new Date(1_700_000_000_000 + seq * 1000)
const where = (row: Row, w: Row) =>
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
    findFirst: async ({ where: w }: { where: Row }) =>
      db.invitations.find((i) => where(i, w)) ?? null,
    findUnique: async ({ where: w }: { where: Row }) =>
      db.invitations.find((i) => i.id === w.id) ?? null,
    findMany: async ({ where: w, orderBy }: { where: Row; orderBy?: Row }) => {
      const rows = db.invitations.filter((i) => where(i, w))
      if (orderBy && (orderBy as Row).createdAt === "desc") {
        rows.sort(
          (a, b) =>
            (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
        )
      }
      return rows
    },
    update: async ({ where: w, data }: { where: Row; data: Row }) => {
      const i = db.invitations.find((x) => x.id === w.id)!
      Object.assign(i, data)
      return i
    },
    updateMany: async ({ where: w, data }: { where: Row; data: Row }) => {
      let count = 0
      for (const i of db.invitations)
        if (where(i, w)) {
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
    create: async ({ data }: { data: Row }) => {
      const row = { id: nextId("mem"), ...data }
      db.members.push(row)
      return row
    },
  },
  dashUser: {
    findUnique: async ({ where: w }: { where: Row }) =>
      db.dashUsers.find((u) => u.email === w.email || u.id === w.id) ?? null,
    update: async ({ where: w, data }: { where: Row; data: Row }) => {
      const u = db.dashUsers.find((x) => x.id === w.id)!
      Object.assign(u, data)
      return u
    },
  },
  // Callback form: the service runs membership + status update atomically.
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prismaMock),
}

describe("Invitations (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const ADMIN = {
    session: { id: "s1" },
    user: { id: "admin-1", email: "admin@example.com" },
  }

  /** Invite an owner as the admin and return the captured raw token. */
  async function inviteOwner(email: string): Promise<string> {
    __setSession(ADMIN)
    await request(http())
      .post("/api/admin/restaurants/r1/invitations")
      .send({ email })
      .expect(201)
    __setSession(null)
    return mockEmail.lastLink.split("/davet/")[1]!
  }

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
    db.restaurants = [{ id: "r1", name: "Test Restaurant", slug: "test" }]
    db.invitations = []
    db.members = []
    db.dashUsers = []
    seq = 0
    mockEmail.lastLink = ""
    __resetAuthMock()
    // The real Prisma adapter would persist the user; mirror that here.
    signUpEmail.mockImplementation(async (opts) => {
      const { email } = (opts as { body: { email: string } }).body
      const id = nextId("du")
      db.dashUsers.push({ id, email, emailVerified: false })
      return { user: { id } }
    })
  })

  afterAll(async () => app.close())

  describe("admin surface (guarded)", () => {
    it("rejects invite/list/revoke without an admin session (401)", async () => {
      await request(http())
        .post("/api/admin/restaurants/r1/invitations")
        .send({ email: "owner@example.com" })
        .expect(401)
      await request(http())
        .get("/api/admin/restaurants/r1/invitations")
        .expect(401)
      await request(http()).delete("/api/admin/invitations/inv1").expect(401)
    })

    it("rejects an invalid email body (400)", async () => {
      __setSession(ADMIN)
      await request(http())
        .post("/api/admin/restaurants/r1/invitations")
        .send({ email: "not-an-email" })
        .expect(400)
    })

    it("creates a PENDING owner invitation and emails a link", async () => {
      __setSession(ADMIN)
      const res = await request(http())
        .post("/api/admin/restaurants/r1/invitations")
        .send({ email: "Owner@Example.com" })
        .expect(201)
      expect(res.body.invitation).toMatchObject({
        email: "owner@example.com", // normalized
        role: "OWNER",
        status: "PENDING",
      })
      expect(mockEmail.lastLink).toContain("/davet/")
    })

    it("lists invitations newest-first for the restaurant", async () => {
      await inviteOwner("a@example.com")
      await inviteOwner("b@example.com")
      __setSession(ADMIN)
      const res = await request(http())
        .get("/api/admin/restaurants/r1/invitations")
        .expect(200)
      expect(res.body.invitations).toHaveLength(2)
      expect(res.body.invitations[0].email).toBe("b@example.com")
    })
  })

  describe("public token surface", () => {
    it("looks up a pending invitation", async () => {
      const token = await inviteOwner("owner@example.com")
      const res = await request(http())
        .get(`/api/invitations/${token}`)
        .expect(200)
      expect(res.body).toMatchObject({
        restaurantName: "Test Restaurant",
        email: "owner@example.com",
        role: "OWNER",
        status: "PENDING",
      })
    })

    it("404s an unknown token", async () => {
      const res = await request(http())
        .get("/api/invitations/does-not-exist")
        .expect(404)
      expect(res.body.code).toBe(ErrorCode.INVITATION_NOT_FOUND)
    })

    it("accepts an invitation: creates a verified user + OWNER membership, marks it ACCEPTED", async () => {
      const token = await inviteOwner("owner@example.com")
      await request(http())
        .post(`/api/invitations/${token}/accept`)
        .send({ password: "owner-secret-pw" })
        .expect(201)

      expect(db.dashUsers).toHaveLength(1)
      expect(db.dashUsers[0]).toMatchObject({
        email: "owner@example.com",
        emailVerified: true,
      })
      expect(db.members).toHaveLength(1)
      expect(db.members[0]).toMatchObject({ role: "OWNER", restaurantId: "r1" })
      expect(db.invitations[0]!.status).toBe("ACCEPTED")
    })

    it("rejects a too-short password (400)", async () => {
      const token = await inviteOwner("owner@example.com")
      await request(http())
        .post(`/api/invitations/${token}/accept`)
        .send({ password: "short" })
        .expect(400)
    })

    it("rejects reuse of an accepted invitation (409)", async () => {
      const token = await inviteOwner("owner@example.com")
      await request(http())
        .post(`/api/invitations/${token}/accept`)
        .send({ password: "owner-secret-pw" })
        .expect(201)
      const res = await request(http())
        .post(`/api/invitations/${token}/accept`)
        .send({ password: "owner-secret-pw" })
        .expect(409)
      expect(res.body.code).toBe(ErrorCode.INVITATION_ALREADY_USED)
    })

    it("rejects a revoked invitation (409)", async () => {
      const token = await inviteOwner("owner@example.com")
      const id = db.invitations[0]!.id as string
      __setSession(ADMIN)
      await request(http()).delete(`/api/admin/invitations/${id}`).expect(204)
      __setSession(null)
      const res = await request(http())
        .get(`/api/invitations/${token}`)
        .expect(409)
      expect(res.body.code).toBe(ErrorCode.INVITATION_REVOKED)
    })

    it("expires an elapsed invitation lazily (409)", async () => {
      const token = await inviteOwner("owner@example.com")
      db.invitations[0]!.expiresAt = new Date(Date.now() - 1000)
      const res = await request(http())
        .get(`/api/invitations/${token}`)
        .expect(409)
      expect(res.body.code).toBe(ErrorCode.INVITATION_EXPIRED)
      expect(db.invitations[0]!.status).toBe("EXPIRED")
    })

    it("supersedes a prior pending invite for the same email", async () => {
      const first = await inviteOwner("owner@example.com")
      await inviteOwner("owner@example.com")
      expect(db.invitations).toHaveLength(2)
      // The first invite is now REVOKED; its token no longer works.
      const res = await request(http())
        .get(`/api/invitations/${first}`)
        .expect(409)
      expect(res.body.code).toBe(ErrorCode.INVITATION_REVOKED)
    })
  })
})
