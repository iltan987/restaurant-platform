import { __resetAuthMock, signUpEmail } from "../../test/better-auth.mock"

// The seed reads the admin via Prisma and creates it via Better Auth. Mock the
// DB delegate; Better Auth is mapped to the test mock by jest config.
jest.mock("@repo/db", () => ({
  prisma: { admin_user: { findUnique: jest.fn() } },
}))

import { prisma } from "@repo/db"

import { seedAdmin } from "./seed-admin"

const findUnique = prisma.admin_user.findUnique as jest.Mock

describe("seedAdmin", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    __resetAuthMock()
    findUnique.mockReset()
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com"
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "a-strong-password"
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("skips when bootstrap env vars are absent", async () => {
    delete process.env.ADMIN_BOOTSTRAP_EMAIL
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD

    await expect(seedAdmin()).resolves.toBe("skipped")
    expect(findUnique).not.toHaveBeenCalled()
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it("creates the admin when none exists", async () => {
    findUnique.mockResolvedValue(null)

    await expect(seedAdmin()).resolves.toBe("created")
    expect(signUpEmail).toHaveBeenCalledTimes(1)
    expect(signUpEmail).toHaveBeenCalledWith({
      body: expect.objectContaining({ email: "admin@example.com" }),
    })
  })

  it("is idempotent — no-op when the admin already exists", async () => {
    findUnique.mockResolvedValue({ id: "existing-admin-id" })

    await expect(seedAdmin()).resolves.toBe("exists")
    expect(signUpEmail).not.toHaveBeenCalled()
  })

  it("looks the admin up by normalized (lower-cased, trimmed) email", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "  Admin@Example.COM  "
    findUnique.mockResolvedValue({ id: "x" })

    await seedAdmin()
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "admin@example.com" } })
    )
  })
})
