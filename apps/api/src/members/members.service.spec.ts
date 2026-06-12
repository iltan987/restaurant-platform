import { ErrorCode, type RestaurantRole } from "@repo/schemas"

import { InvitationsService } from "../invitations/invitations.service"
import { MembersService } from "./members.service"

function member(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m1",
    restaurantId: "r1",
    userId: "u1",
    role: "OWNER" as RestaurantRole,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

/** Minimal PrismaService double covering the delegates MembersService touches. */
function makePrisma() {
  return {
    restaurantMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dashUser: { findUnique: jest.fn(), findMany: jest.fn() },
  }
}

describe("MembersService", () => {
  let prisma: ReturnType<typeof makePrisma>
  let invitations: { invite: jest.Mock }
  let service: MembersService

  beforeEach(() => {
    prisma = makePrisma()
    invitations = { invite: jest.fn() }
    service = new MembersService(
      prisma as never,
      invitations as unknown as InvitationsService
    )
  })

  describe("requirePermission", () => {
    it("denies a non-member with NOT_A_MEMBER", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(null)
      await expect(
        service.requirePermission("r1", "u1", "members:manage")
      ).rejects.toMatchObject({ response: { code: ErrorCode.NOT_A_MEMBER } })
    })

    it("allows an OWNER to manage members", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "OWNER" })
      )
      await expect(
        service.requirePermission("r1", "u1", "members:manage")
      ).resolves.toMatchObject({ role: "OWNER" })
    })

    it.each<RestaurantRole>(["MANAGER", "STAFF"])(
      "denies %s from managing members with INSUFFICIENT_ROLE",
      async (role) => {
        prisma.restaurantMember.findUnique.mockResolvedValue(member({ role }))
        await expect(
          service.requirePermission("r1", "u1", "members:manage")
        ).rejects.toMatchObject({
          response: { code: ErrorCode.INSUFFICIENT_ROLE },
        })
      }
    )

    it("allows a MANAGER to manage the menu", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "MANAGER" })
      )
      await expect(
        service.requirePermission("r1", "u1", "menu:manage")
      ).resolves.toMatchObject({ role: "MANAGER" })
    })
  })

  describe("changeRole — last-owner invariant", () => {
    it("rejects demoting the only owner with LAST_OWNER", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "OWNER" })
      )
      prisma.dashUser.findUnique.mockResolvedValue({ email: "o@x.com" })
      prisma.restaurantMember.count.mockResolvedValue(1)

      await expect(
        service.changeRole("r1", "u1", "MANAGER")
      ).rejects.toMatchObject({ response: { code: ErrorCode.LAST_OWNER } })
      expect(prisma.restaurantMember.update).not.toHaveBeenCalled()
    })

    it("allows demoting an owner when another owner remains", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "OWNER" })
      )
      prisma.dashUser.findUnique.mockResolvedValue({ email: "o@x.com" })
      prisma.restaurantMember.count.mockResolvedValue(2)
      prisma.restaurantMember.update.mockResolvedValue(
        member({ role: "MANAGER" })
      )

      await service.changeRole("r1", "u1", "MANAGER")
      expect(prisma.restaurantMember.update).toHaveBeenCalledWith({
        where: { restaurantId_userId: { restaurantId: "r1", userId: "u1" } },
        data: { role: "MANAGER" },
      })
    })

    it("promoting a non-owner to owner never triggers the invariant", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "STAFF" })
      )
      prisma.dashUser.findUnique.mockResolvedValue({ email: "s@x.com" })
      prisma.restaurantMember.update.mockResolvedValue(
        member({ role: "OWNER" })
      )

      await service.changeRole("r1", "u1", "OWNER")
      expect(prisma.restaurantMember.count).not.toHaveBeenCalled()
      expect(prisma.restaurantMember.update).toHaveBeenCalled()
    })
  })

  describe("removeMember — last-owner invariant", () => {
    it("rejects removing the only owner with LAST_OWNER", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "OWNER" })
      )
      prisma.dashUser.findUnique.mockResolvedValue({ email: "o@x.com" })
      prisma.restaurantMember.count.mockResolvedValue(1)

      await expect(service.removeMember("r1", "u1")).rejects.toMatchObject({
        response: { code: ErrorCode.LAST_OWNER },
      })
      expect(prisma.restaurantMember.delete).not.toHaveBeenCalled()
    })

    it("removes a non-owner member without counting owners", async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(
        member({ role: "STAFF" })
      )
      prisma.dashUser.findUnique.mockResolvedValue({ email: "s@x.com" })
      prisma.restaurantMember.delete.mockResolvedValue(member())

      await service.removeMember("r1", "u1")
      expect(prisma.restaurantMember.count).not.toHaveBeenCalled()
      expect(prisma.restaurantMember.delete).toHaveBeenCalledWith({
        where: { restaurantId_userId: { restaurantId: "r1", userId: "u1" } },
      })
    })
  })

  describe("inviteMember", () => {
    it("delegates to the invitation pipeline attributed to the inviting owner", async () => {
      invitations.invite.mockResolvedValue({ id: "inv1" })

      await service.inviteMember("r1", "owner1", {
        email: "new@x.com",
        role: "MANAGER",
      })

      expect(invitations.invite).toHaveBeenCalledWith({
        restaurantId: "r1",
        email: "new@x.com",
        role: "MANAGER",
        invitedByAdmin: false,
        invitedByUserId: "owner1",
      })
    })
  })
})
