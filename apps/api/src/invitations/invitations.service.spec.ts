import { ErrorCode } from "@repo/schemas"

import { signUpEmail } from "../../test/better-auth.mock"
import { InvitationsService } from "./invitations.service"

// A fake invitation row, overridable per test.
function invitation(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv1",
    restaurantId: "r1",
    email: "owner@example.com",
    role: "OWNER",
    status: "PENDING",
    tokenHash: "irrelevant — findFirst is stubbed",
    invitedByAdmin: true,
    invitedByUserId: null,
    expiresAt: new Date(Date.now() + 60_000),
    acceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

type Mock = jest.Mock

/** Minimal PrismaService double covering the delegates the service touches. */
function makePrisma() {
  const delegates = {
    restaurant: { findUnique: jest.fn() },
    restaurantInvitation: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    restaurantMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    dashUser: { findUnique: jest.fn(), update: jest.fn() },
  }
  // $transaction runs the callback against the same delegate set (the tx).
  return {
    ...delegates,
    $transaction: jest.fn((cb: (tx: typeof delegates) => unknown) =>
      Promise.resolve(cb(delegates))
    ),
  }
}

describe("InvitationsService", () => {
  let prisma: ReturnType<typeof makePrisma>
  let service: InvitationsService

  beforeEach(() => {
    signUpEmail.mockClear()
    prisma = makePrisma()
    service = new InvitationsService(prisma as never)
  })

  describe("invite", () => {
    it("supersedes a prior pending invite, stores a token hash, and creates it", async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: "r1",
        name: "Bistro",
      })
      prisma.restaurantInvitation.create.mockResolvedValue(invitation())

      await service.invite({
        restaurantId: "r1",
        email: "Owner@Example.com",
        role: "OWNER",
        invitedByAdmin: true,
      })

      // Prior pending for this (restaurant,email) is revoked first.
      expect(prisma.restaurantInvitation.updateMany).toHaveBeenCalledWith({
        where: {
          restaurantId: "r1",
          email: "owner@example.com",
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      })
      const createArg = (prisma.restaurantInvitation.create as Mock).mock
        .calls[0][0]
      expect(createArg.data.email).toBe("owner@example.com")
      expect(createArg.data.tokenHash).toEqual(expect.any(String))
      // The raw token is never persisted.
      expect(createArg.data).not.toHaveProperty("token")
    })

    it("rejects when the restaurant does not exist", async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null)
      await expect(
        service.invite({
          restaurantId: "missing",
          email: "x@y.com",
          role: "OWNER",
          invitedByAdmin: true,
        })
      ).rejects.toMatchObject({
        response: { code: ErrorCode.RESTAURANT_NOT_FOUND },
      })
    })
  })

  describe("revoke", () => {
    it("rejects revoking a non-pending invitation", async () => {
      prisma.restaurantInvitation.findUnique.mockResolvedValue(
        invitation({ status: "ACCEPTED" })
      )
      await expect(service.revoke("inv1")).rejects.toMatchObject({
        response: { code: ErrorCode.INVITATION_NOT_PENDING },
      })
    })
  })

  describe("terminal-state tokens are rejected", () => {
    it.each([
      ["ACCEPTED", ErrorCode.INVITATION_ALREADY_USED],
      ["REVOKED", ErrorCode.INVITATION_REVOKED],
    ])("%s → %s", async (status, code) => {
      prisma.restaurantInvitation.findFirst.mockResolvedValue(
        invitation({ status })
      )
      await expect(service.lookup("raw")).rejects.toMatchObject({
        response: { code },
      })
    })

    it("expired pending → EXPIRED (and is lazily marked)", async () => {
      prisma.restaurantInvitation.findFirst.mockResolvedValue(
        invitation({ expiresAt: new Date(Date.now() - 1000) })
      )
      await expect(service.lookup("raw")).rejects.toMatchObject({
        response: { code: ErrorCode.INVITATION_EXPIRED },
      })
      expect(prisma.restaurantInvitation.update).toHaveBeenCalledWith({
        where: { id: "inv1" },
        data: { status: "EXPIRED" },
      })
    })

    it("unknown token → NOT_FOUND", async () => {
      prisma.restaurantInvitation.findFirst.mockResolvedValue(null)
      await expect(service.lookup("raw")).rejects.toMatchObject({
        response: { code: ErrorCode.INVITATION_NOT_FOUND },
      })
    })
  })

  describe("accept", () => {
    it("creates a verified user, attaches membership, and marks accepted", async () => {
      prisma.restaurantInvitation.findFirst.mockResolvedValue(invitation())
      prisma.dashUser.findUnique
        .mockResolvedValueOnce(null) // none yet → sign up
        .mockResolvedValueOnce({ id: "u1" }) // re-read after sign-up
      prisma.restaurantMember.findUnique.mockResolvedValue(null)

      await service.accept("raw", "a-strong-password")

      expect(signUpEmail).toHaveBeenCalledTimes(1)
      expect(prisma.dashUser.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { emailVerified: true },
      })
      expect(prisma.restaurantMember.create).toHaveBeenCalledWith({
        data: { restaurantId: "r1", userId: "u1", role: "OWNER" },
      })
      expect(prisma.restaurantInvitation.update).toHaveBeenCalledWith({
        where: { id: "inv1" },
        data: { status: "ACCEPTED", acceptedAt: expect.any(Date) },
      })
    })

    it("does not re-create the user or membership when both already exist", async () => {
      prisma.restaurantInvitation.findFirst.mockResolvedValue(invitation())
      prisma.dashUser.findUnique.mockResolvedValue({ id: "u1" }) // exists
      prisma.restaurantMember.findUnique.mockResolvedValue({ id: "m1" }) // member

      await service.accept("raw", "a-strong-password")

      expect(signUpEmail).not.toHaveBeenCalled()
      expect(prisma.restaurantMember.create).not.toHaveBeenCalled()
      expect(prisma.restaurantInvitation.update).toHaveBeenCalledWith({
        where: { id: "inv1" },
        data: { status: "ACCEPTED", acceptedAt: expect.any(Date) },
      })
    })
  })

  describe("adminGetOwner", () => {
    it("returns null when no OWNER member exists", async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(null)

      const result = await service.adminGetOwner("r1")

      expect(result).toEqual({ owner: null })
    })

    it("returns owner details joined with DashUser email", async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue({
        id: "m1",
        restaurantId: "r1",
        userId: "u1",
        role: "OWNER",
        suspended: false,
        directlyAssigned: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      prisma.dashUser.findUnique.mockResolvedValue({
        id: "u1",
        email: "owner@example.com",
      })

      const result = await service.adminGetOwner("r1")

      expect(result).toEqual({
        owner: {
          email: "owner@example.com",
          suspended: false,
          directlyAssigned: true,
        },
      })
    })
  })
})
