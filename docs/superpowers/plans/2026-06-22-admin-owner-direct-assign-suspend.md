# Admin Owner: Direct Assignment & Membership Suspension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin directly assign ownership without the email flow (showing a one-time temp password), and temporarily suspend an owner's dashboard access without deleting their membership.

**Architecture:** Three new admin endpoints added to `AdminInvitationsController` (already guarded by `AdminAuthGuard`). Prisma schema gains two booleans on `RestaurantMember`. The admin Devir tab switches its ownership-detection source from the invitation list to a dedicated owner endpoint — keeping invitations as the truth about pending email flows only. Suspension is enforced in `MembersService.requireMembership` (the single gateway all dashboard member checks pass through).

**Tech Stack:** NestJS 11 (Express 5), Prisma 7, Zod 4, Next.js 16, TanStack Query, React Hook Form, Base UI + shadcn (`render` prop — not `asChild`), lucide-react, sonner.

## Global Constraints

- All admin endpoints use `AdminAuthGuard` (class-level decorator already on `AdminInvitationsController`).
- No `asChild` on Base UI components — use `render={<Button .../>}` pattern.
- Input validation via `ZodValidationPipe` wrapping a schema from `@repo/schemas`.
- New `ErrorCode` entries require a Turkish string in `packages/i18n/src/error-messages.ts` — the map is typed as `Record<ErrorCode, string>` so omissions are compile errors.
- Package build order: rebuild `@repo/schemas` and `@repo/core` before running API — `pnpm --filter @repo/schemas build`.
- Test commands: `pnpm --filter api test` (unit), `pnpm --filter admin typecheck` (frontend types).
- No semicolons, double quotes, `printWidth: 80` (Prettier enforced on commit).

---

## File Map

| File                                                              | Action                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`                                | Modify — add `suspended`, `directlyAssigned` to `RestaurantMember`                |
| `packages/schemas/src/membership.ts`                              | Modify — add `restaurantOwnerSchema`, `RestaurantOwner`, `toggleSuspensionSchema` |
| `packages/schemas/src/errors.ts`                                  | Modify — add `MEMBER_SUSPENDED`                                                   |
| `packages/i18n/src/error-messages.ts`                             | Modify — add Turkish for `MEMBER_SUSPENDED`                                       |
| `apps/api/src/invitations/invitations.service.ts`                 | Modify — add `adminGetOwner`, `adminDirectAssign`, `adminToggleSuspension`        |
| `apps/api/src/invitations/invitations.service.spec.ts`            | Modify — extend `makePrisma`, add test blocks                                     |
| `apps/api/src/invitations/invitations.controller.ts`              | Modify — add 3 new admin endpoints                                                |
| `apps/api/src/members/members.service.ts`                         | Modify — add `suspended` check in `requireMembership`                             |
| `apps/admin/features/invitations/api.ts`                          | Modify — add `fetchOwner`, `directAssign`, `toggleSuspension`                     |
| `apps/admin/features/invitations/queries.ts`                      | Modify — add `ownerQueries`                                                       |
| `apps/admin/features/invitations/use-direct-assign.ts`            | **Create**                                                                        |
| `apps/admin/features/invitations/use-toggle-suspension.ts`        | **Create**                                                                        |
| `apps/admin/features/invitations/use-remove-owner.ts`             | Modify — also invalidate `ownerQueries`                                           |
| `apps/admin/features/restaurants/components/detail/tab-devir.tsx` | Modify — switch state machine to owner endpoint, add new states                   |

---

### Task 1: Prisma Schema — add `suspended` and `directlyAssigned`

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

**Interfaces:**

- Produces: `RestaurantMember` model gains `suspended Boolean @default(false)` and `directlyAssigned Boolean @default(false)` — used by Tasks 3–5.

- [ ] **Step 1: Add two fields to `RestaurantMember` in the schema**

  Open `packages/db/prisma/schema.prisma`. Find the `RestaurantMember` model and add two lines before the closing brace:

  ```prisma
  suspended        Boolean @default(false)
  directlyAssigned Boolean @default(false)
  ```

- [ ] **Step 2: Generate and apply the migration**

  ```bash
  pnpm --filter @repo/db db:migrate -- --name add-member-suspend-direct-assign
  ```

  Expected: Prisma prints `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate the Prisma client**

  ```bash
  pnpm --filter @repo/db db:generate
  ```

  Expected: `Generated Prisma Client` message.

- [ ] **Step 4: Rebuild compiled packages**

  ```bash
  pnpm --filter @repo/db build
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add packages/db/prisma/schema.prisma packages/db/prisma/migrations
  git commit -m "feat(db): add suspended and directlyAssigned to RestaurantMember"
  ```

---

### Task 2: Shared packages — ErrorCode, schemas, i18n

**Files:**

- Modify: `packages/schemas/src/errors.ts`
- Modify: `packages/schemas/src/membership.ts`
- Modify: `packages/i18n/src/error-messages.ts`

**Interfaces:**

- Produces:
  - `ErrorCode.MEMBER_SUSPENDED` — used in Tasks 5 and 6.
  - `restaurantOwnerSchema` / `RestaurantOwner` — used in Task 3 (API response) and Task 7 (frontend `apiFetch` validation).
  - `toggleSuspensionSchema` — used in Task 5 (controller `ZodValidationPipe`).

- [ ] **Step 1: Add `MEMBER_SUSPENDED` to the ErrorCode enum**

  In `packages/schemas/src/errors.ts`, find the auth/membership block and add:

  ```ts
  MEMBER_SUSPENDED = "MEMBER_SUSPENDED",
  ```

  Place it after `LAST_OWNER`.

- [ ] **Step 2: Add `restaurantOwnerSchema` and `toggleSuspensionSchema` to membership schemas**

  In `packages/schemas/src/membership.ts`, append at the end of the file:

  ```ts
  /** Current owner of a restaurant as seen by the admin (member-table derived). */
  export const restaurantOwnerSchema = z.object({
    email: z.string(),
    suspended: z.boolean(),
    directlyAssigned: z.boolean(),
  })
  export type RestaurantOwner = z.infer<typeof restaurantOwnerSchema>

  /** Body for the admin suspend/unsuspend endpoint. */
  export const toggleSuspensionSchema = z.object({
    suspended: z.boolean(),
  })
  export type ToggleSuspensionInput = z.infer<typeof toggleSuspensionSchema>
  ```

- [ ] **Step 3: Add the Turkish string for `MEMBER_SUSPENDED`**

  In `packages/i18n/src/error-messages.ts`, add to the `tr` map after `LAST_OWNER`:

  ```ts
  [ErrorCode.MEMBER_SUSPENDED]:
    "Hesabınız bu restoran için askıya alınmıştır.",
  ```

- [ ] **Step 4: Rebuild `@repo/schemas`**

  ```bash
  pnpm --filter @repo/schemas build
  ```

  Expected: exits 0.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/schemas/src/errors.ts packages/schemas/src/membership.ts \
    packages/i18n/src/error-messages.ts
  git commit -m "feat(schemas): add MEMBER_SUSPENDED code, restaurantOwnerSchema, toggleSuspensionSchema"
  ```

---

### Task 3: API — owner state endpoint (`GET /admin/restaurants/:restaurantId/owner`)

**Files:**

- Modify: `apps/api/src/invitations/invitations.service.ts`
- Modify: `apps/api/src/invitations/invitations.service.spec.ts`
- Modify: `apps/api/src/invitations/invitations.controller.ts`

**Interfaces:**

- Produces: `InvitationsService.adminGetOwner(restaurantId: string): Promise<{ owner: { email: string; suspended: boolean; directlyAssigned: boolean } | null }>` — used by Task 7 (admin frontend).

- [ ] **Step 1: Write the failing unit tests**

  In `apps/api/src/invitations/invitations.service.spec.ts`:

  1. Extend `makePrisma()` — add the delegates the new methods need:

  ```ts
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
    return {
      ...delegates,
      $transaction: jest.fn((cb: (tx: typeof delegates) => unknown) =>
        Promise.resolve(cb(delegates))
      ),
    }
  }
  ```

  2. Add a `describe("adminGetOwner")` block after the existing `describe("accept")` block:

  ```ts
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
  ```

- [ ] **Step 2: Run tests — verify the new cases FAIL**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: `adminGetOwner` suite fails with `service.adminGetOwner is not a function`.

- [ ] **Step 3: Implement `adminGetOwner` in the service**

  In `apps/api/src/invitations/invitations.service.ts`, add after `adminRemoveOwner`:

  ```ts
  /** Current OWNER for a restaurant, derived from the member table (admin view). */
  async adminGetOwner(restaurantId: string) {
    const member = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (!member) return { owner: null }
    const user = await this.prisma.dashUser.findUnique({
      where: { id: member.userId },
      select: { email: true },
    })
    return {
      owner: {
        email: user?.email ?? "",
        suspended: member.suspended,
        directlyAssigned: member.directlyAssigned,
      },
    }
  }
  ```

- [ ] **Step 4: Add the GET endpoint to the controller**

  In `apps/api/src/invitations/invitations.controller.ts`, add inside `AdminInvitationsController` (after `removeOwner`):

  ```ts
  @Get("restaurants/:restaurantId/owner")
  getOwner(@Param("restaurantId") restaurantId: string) {
    return this.invitations.adminGetOwner(restaurantId)
  }
  ```

- [ ] **Step 5: Run tests — verify they pass**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: all tests pass including the two new `adminGetOwner` cases.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/api/src/invitations/invitations.service.ts \
    apps/api/src/invitations/invitations.service.spec.ts \
    apps/api/src/invitations/invitations.controller.ts
  git commit -m "feat(api): admin GET owner endpoint"
  ```

---

### Task 4: API — direct assignment (`POST /admin/restaurants/:restaurantId/owner/direct`)

**Files:**

- Modify: `apps/api/src/invitations/invitations.service.ts`
- Modify: `apps/api/src/invitations/invitations.service.spec.ts`
- Modify: `apps/api/src/invitations/invitations.controller.ts`

**Interfaces:**

- Consumes: `inviteOwnerSchema` from `@repo/schemas` (reused for email validation — same `{ email }` shape).
- Produces: `InvitationsService.adminDirectAssign(restaurantId: string, email: string): Promise<{ tempPassword: string | null }>` — used by Task 7.

- [ ] **Step 1: Write the failing unit tests**

  Add a `describe("adminDirectAssign")` block to `invitations.service.spec.ts`:

  ```ts
  describe("adminDirectAssign", () => {
    it("creates a new dashboard user and OWNER member, returns temp password", async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: "r1",
        name: "Bistro",
      })
      prisma.restaurantMember.findFirst.mockResolvedValue(null) // no existing owner
      prisma.dashUser.findUnique
        .mockResolvedValueOnce(null) // user doesn't exist yet
        .mockResolvedValueOnce({ id: "u1" }) // re-read after signUpEmail
      prisma.dashUser.update.mockResolvedValue({} as never)
      prisma.restaurantMember.create.mockResolvedValue({} as never)

      const result = await service.adminDirectAssign("r1", "New@Example.com")

      expect(signUpEmail).toHaveBeenCalledTimes(1)
      expect(signUpEmail.mock.calls[0][0].body.email).toBe("new@example.com")
      expect(prisma.dashUser.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { emailVerified: true },
      })
      expect(prisma.restaurantMember.create).toHaveBeenCalledWith({
        data: {
          restaurantId: "r1",
          userId: "u1",
          role: "OWNER",
          directlyAssigned: true,
        },
      })
      expect(result.tempPassword).toMatch(/^[\w-]{16}$/)
    })

    it("assigns an existing user as owner, returns null temp password", async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: "r1",
        name: "Bistro",
      })
      prisma.restaurantMember.findFirst.mockResolvedValue(null)
      prisma.dashUser.findUnique.mockResolvedValue({ id: "u1" }) // user exists

      prisma.restaurantMember.create.mockResolvedValue({} as never)

      const result = await service.adminDirectAssign(
        "r1",
        "existing@example.com"
      )

      expect(signUpEmail).not.toHaveBeenCalled()
      expect(result.tempPassword).toBeNull()
    })

    it("throws CONFLICT when restaurant already has an OWNER", async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: "r1",
        name: "Bistro",
      })
      prisma.restaurantMember.findFirst.mockResolvedValue({ id: "m1" } as never)

      await expect(
        service.adminDirectAssign("r1", "new@example.com")
      ).rejects.toMatchObject({
        response: { code: ErrorCode.CONFLICT },
      })
    })

    it("throws RESTAURANT_NOT_FOUND for an unknown restaurant", async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null)

      await expect(
        service.adminDirectAssign("missing", "x@example.com")
      ).rejects.toMatchObject({
        response: { code: ErrorCode.RESTAURANT_NOT_FOUND },
      })
    })
  })
  ```

- [ ] **Step 2: Run tests — verify the new cases FAIL**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: `adminDirectAssign` suite fails with `service.adminDirectAssign is not a function`.

- [ ] **Step 3: Add the `generatePassword` helper to the service file**

  In `apps/api/src/invitations/invitations.service.ts`, add alongside the existing helpers at the bottom of the file (after `normalizeEmail`):

  ```ts
  /** 16-char URL-safe password from 12 random bytes. */
  function generatePassword(): string {
    return randomBytes(12).toString("base64url").slice(0, 16)
  }
  ```

- [ ] **Step 4: Implement `adminDirectAssign` in the service**

  Add after `adminGetOwner`:

  ```ts
  /**
   * Directly assign an OWNER without the email invitation flow. Creates a
   * dashboard user with a generated password when none exists for `email`;
   * returns that password (shown once to the admin) or null if the user
   * already had an account.
   */
  async adminDirectAssign(
    restaurantId: string,
    email: string
  ): Promise<{ tempPassword: string | null }> {
    const normalized = normalizeEmail(email)

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant ${restaurantId} not found`,
      })
    }

    const existingOwner = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (existingOwner) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: "This restaurant already has an owner",
      })
    }

    // Find or create dashboard user — same pattern as ensureDashboardUser.
    let tempPassword: string | null = null
    let user = await this.prisma.dashUser.findUnique({
      where: { email: normalized },
      select: { id: true },
    })

    if (!user) {
      tempPassword = generatePassword()
      await dashboardSignUpAuth.api.signUpEmail({
        body: {
          email: normalized,
          password: tempPassword,
          name: normalized.split("@")[0] ?? "Owner",
        },
      })
      user = await this.prisma.dashUser.findUnique({
        where: { email: normalized },
        select: { id: true },
      })
      if (!user) {
        throw new ConflictException({
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create dashboard user",
        })
      }
      await this.prisma.dashUser.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
    }

    await this.prisma.restaurantMember.create({
      data: {
        restaurantId,
        userId: user.id,
        role: "OWNER",
        directlyAssigned: true,
      },
    })

    return { tempPassword }
  }
  ```

- [ ] **Step 5: Add the POST endpoint to the controller**

  In `apps/api/src/invitations/invitations.controller.ts`, add `inviteOwnerSchema` and `InviteOwnerInput` are already imported. Add inside `AdminInvitationsController`:

  ```ts
  @Post("restaurants/:restaurantId/owner/direct")
  directAssign(
    @Param("restaurantId") restaurantId: string,
    @Body(new ZodValidationPipe(inviteOwnerSchema)) body: InviteOwnerInput
  ) {
    return this.invitations.adminDirectAssign(restaurantId, body.email)
  }
  ```

- [ ] **Step 6: Run tests — verify they pass**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/api/src/invitations/invitations.service.ts \
    apps/api/src/invitations/invitations.service.spec.ts \
    apps/api/src/invitations/invitations.controller.ts
  git commit -m "feat(api): admin direct owner assignment endpoint"
  ```

---

### Task 5: API — suspend toggle + dashboard guard

**Files:**

- Modify: `apps/api/src/invitations/invitations.service.ts`
- Modify: `apps/api/src/invitations/invitations.service.spec.ts`
- Modify: `apps/api/src/invitations/invitations.controller.ts`
- Modify: `apps/api/src/members/members.service.ts`

**Interfaces:**

- Consumes: `toggleSuspensionSchema` / `ToggleSuspensionInput` from `@repo/schemas` (Task 2). `ErrorCode.MEMBER_SUSPENDED` (Task 2).
- Produces: `InvitationsService.adminToggleSuspension(restaurantId, suspended)` — used by Task 7. `MembersService.requireMembership` now throws `MEMBER_SUSPENDED` for suspended members — enforced for all dashboard access.

- [ ] **Step 1: Write the failing unit tests**

  Add a `describe("adminToggleSuspension")` block:

  ```ts
  describe("adminToggleSuspension", () => {
    it("sets suspended=true on the OWNER member", async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue({
        id: "m1",
      } as never)

      await service.adminToggleSuspension("r1", true)

      expect(prisma.restaurantMember.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { suspended: true },
      })
    })

    it("sets suspended=false to re-enable", async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue({
        id: "m1",
      } as never)

      await service.adminToggleSuspension("r1", false)

      expect(prisma.restaurantMember.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { suspended: false },
      })
    })

    it("throws NOT_A_MEMBER when no OWNER exists", async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(null)

      await expect(
        service.adminToggleSuspension("r1", true)
      ).rejects.toMatchObject({
        response: { code: ErrorCode.NOT_A_MEMBER },
      })
    })
  })
  ```

- [ ] **Step 2: Run tests — verify the new cases FAIL**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: `adminToggleSuspension` suite fails.

- [ ] **Step 3: Implement `adminToggleSuspension` in the service**

  Add after `adminDirectAssign`:

  ```ts
  /** Suspend or re-enable the OWNER's access without removing their membership. */
  async adminToggleSuspension(
    restaurantId: string,
    suspended: boolean
  ): Promise<void> {
    const owner = await this.prisma.restaurantMember.findFirst({
      where: { restaurantId, role: "OWNER" },
    })
    if (!owner) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "This restaurant has no owner to suspend",
      })
    }
    await this.prisma.restaurantMember.update({
      where: { id: owner.id },
      data: { suspended },
    })
  }
  ```

- [ ] **Step 4: Add the PATCH endpoint to the controller**

  Add the import at the top of `invitations.controller.ts` (alongside existing imports from `@nestjs/common`):

  ```ts
  Patch,
  ```

  (add `Patch` to the existing `@nestjs/common` import destructure)

  Also import from `@repo/schemas`:

  ```ts
  type ToggleSuspensionInput,
  toggleSuspensionSchema,
  ```

  Add inside `AdminInvitationsController`:

  ```ts
  @Patch("restaurants/:restaurantId/owner/suspended")
  @HttpCode(204)
  toggleSuspension(
    @Param("restaurantId") restaurantId: string,
    @Body(new ZodValidationPipe(toggleSuspensionSchema))
    body: ToggleSuspensionInput
  ) {
    return this.invitations.adminToggleSuspension(restaurantId, body.suspended)
  }
  ```

- [ ] **Step 5: Run tests — verify they pass**

  ```bash
  pnpm --filter api test -- invitations.service
  ```

  Expected: all tests pass.

- [ ] **Step 6: Add the `suspended` check to `MembersService.requireMembership`**

  In `apps/api/src/members/members.service.ts`, update `requireMembership`:

  ```ts
  async requireMembership(restaurantId: string, userId: string) {
    const member = await this.prisma.restaurantMember.findUnique({
      where: { restaurantId_userId: { restaurantId, userId } },
    })
    if (!member) {
      throw new ForbiddenException({
        code: ErrorCode.NOT_A_MEMBER,
        message: "You are not a member of this restaurant",
      })
    }
    if (member.suspended) {
      throw new ForbiddenException({
        code: ErrorCode.MEMBER_SUSPENDED,
        message: "Your account has been suspended for this restaurant",
      })
    }
    return member
  }
  ```

  Add `MEMBER_SUSPENDED` to the `ErrorCode` import at the top of `members.service.ts` (it's already imported from `@repo/schemas`; just add the new value — `ErrorCode.MEMBER_SUSPENDED` is already usable once schemas are rebuilt).

- [ ] **Step 7: Run all API tests**

  ```bash
  pnpm --filter api test
  ```

  Expected: all suites pass.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/src/invitations/invitations.service.ts \
    apps/api/src/invitations/invitations.service.spec.ts \
    apps/api/src/invitations/invitations.controller.ts \
    apps/api/src/members/members.service.ts
  git commit -m "feat(api): admin suspend toggle and dashboard suspension guard"
  ```

---

### Task 6: Admin frontend — new queries, hooks, and Devir tab refactor

**Files:**

- Modify: `apps/admin/features/invitations/api.ts`
- Modify: `apps/admin/features/invitations/queries.ts`
- Create: `apps/admin/features/invitations/use-direct-assign.ts`
- Create: `apps/admin/features/invitations/use-toggle-suspension.ts`
- Modify: `apps/admin/features/restaurants/components/detail/tab-devir.tsx`

**Interfaces:**

- Consumes: `restaurantOwnerSchema` / `RestaurantOwner` from `@repo/schemas` (Task 2). All three new API endpoints (Tasks 3–5). `ownerQueries.byRestaurant` (defined here). `useDirectAssign`, `useToggleSuspension` (defined here).
- Produces: The fully updated `TabDevir` component with four ownership states.

- [ ] **Step 1: Add three API functions to `api.ts`**

  In `apps/admin/features/invitations/api.ts`, add after the existing functions:

  ```ts
  import { type RestaurantOwner, restaurantOwnerSchema } from "@repo/schemas"

  // (add to the top-level imports — the file already imports from @repo/schemas)

  const ownerResultSchema = z.object({
    owner: restaurantOwnerSchema.nullable(),
  })

  /** Current OWNER for a restaurant as the admin sees it (member-table derived). */
  export async function fetchOwner(
    restaurantId: string
  ): Promise<RestaurantOwner | null> {
    const { owner } = await apiFetch(
      `${API}/admin/restaurants/${restaurantId}/owner`,
      ownerResultSchema,
      { cache: "no-store" }
    )
    return owner
  }

  /** Directly assign an owner without the email flow. */
  export async function directAssign(
    restaurantId: string,
    email: string
  ): Promise<{ tempPassword: string | null }> {
    return apiFetch(
      `${API}/admin/restaurants/${restaurantId}/owner/direct`,
      z.object({ tempPassword: z.string().nullable() }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    )
  }

  /** Suspend or re-enable the current owner's access. */
  export function toggleSuspension(
    restaurantId: string,
    suspended: boolean
  ): Promise<void> {
    return apiSend(`${API}/admin/restaurants/${restaurantId}/owner/suspended`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended }),
    })
  }
  ```

  > `packages/schemas/src/index.ts` uses `export * from "./membership"`, so `restaurantOwnerSchema` and `RestaurantOwner` are available from `@repo/schemas` automatically once Task 2 is complete.

- [ ] **Step 2: Add `ownerQueries` to `queries.ts`**

  In `apps/admin/features/invitations/queries.ts`, add:

  ```ts
  import { fetchInvitations, fetchOwner } from "./api"

  export const invitationsQueries = {
    byRestaurant: (restaurantId: string) =>
      queryOptions({
        queryKey: ["invitations", restaurantId],
        queryFn: () => fetchInvitations(restaurantId),
      }),
  }

  export const ownerQueries = {
    byRestaurant: (restaurantId: string) =>
      queryOptions({
        queryKey: ["admin", "owner", restaurantId],
        queryFn: () => fetchOwner(restaurantId),
      }),
  }
  ```

- [ ] **Step 3: Create `use-direct-assign.ts`**

  ```ts
  "use client"

  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { toast } from "sonner"

  import { toastApiError } from "@/lib/toast-error"

  import { directAssign } from "./api"
  import { ownerQueries } from "./queries"

  export function useDirectAssign(restaurantId: string) {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: (email: string) => directAssign(restaurantId, email),
      onSuccess: ({ tempPassword }) => {
        if (!tempPassword) toast.success("Sahip atandı.")
        // When tempPassword is set the component shows the reveal panel — no toast.
      },
      onError: toastApiError,
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ownerQueries.byRestaurant(restaurantId).queryKey,
        })
      },
    })
  }
  ```

- [ ] **Step 4: Create `use-toggle-suspension.ts`**

  ```ts
  "use client"

  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { toast } from "sonner"

  import { toastApiError } from "@/lib/toast-error"

  import { toggleSuspension } from "./api"
  import { ownerQueries } from "./queries"

  export function useToggleSuspension(restaurantId: string) {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: (suspended: boolean) =>
        toggleSuspension(restaurantId, suspended),
      onSuccess: (_, suspended) => {
        toast.success(
          suspended ? "Erişim askıya alındı." : "Erişim yeniden açıldı."
        )
      },
      onError: toastApiError,
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ownerQueries.byRestaurant(restaurantId).queryKey,
        })
      },
    })
  }
  ```

- [ ] **Step 5: Update `use-remove-owner.ts` to also invalidate `ownerQueries`**

  `use-remove-owner.ts` was written before `ownerQueries` existed — it only invalidates `invitationsQueries`. After this refactor the owner card reads from `ownerQueries`, so removal must invalidate both.

  Replace the `onSettled` in `apps/admin/features/invitations/use-remove-owner.ts`:

  ```ts
  "use client"

  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { toast } from "sonner"

  import { toastApiError } from "@/lib/toast-error"

  import { removeOwner } from "./api"
  import { invitationsQueries, ownerQueries } from "./queries"

  export function useRemoveOwner(restaurantId: string) {
    const queryClient = useQueryClient()

    return useMutation({
      mutationFn: () => removeOwner(restaurantId),
      onSuccess: () => {
        toast.success("Sahip kaldırıldı.")
      },
      onError: toastApiError,
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ownerQueries.byRestaurant(restaurantId).queryKey,
        })
        queryClient.invalidateQueries({
          queryKey: invitationsQueries.byRestaurant(restaurantId).queryKey,
        })
      },
    })
  }
  ```

- [ ] **Step 6: Rewrite `tab-devir.tsx`**

  Replace the entire file content with:

  ```tsx
  "use client"

  import { zodResolver } from "@hookform/resolvers/zod"
  import { useQuery } from "@tanstack/react-query"
  import {
    Check,
    Clock,
    Copy,
    Info,
    Mail,
    Pause,
    Play,
    RotateCw,
    Users,
    UserX,
    X,
    Zap,
  } from "lucide-react"
  import { useState } from "react"
  import { useForm } from "react-hook-form"

  import {
    type InviteOwnerInput,
    inviteOwnerSchema,
    type RestaurantWithCounts,
  } from "@repo/schemas"
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@repo/ui/components/ui/alert-dialog"
  import { Badge } from "@repo/ui/components/ui/badge"
  import { Button } from "@repo/ui/components/ui/button"
  import { Input } from "@repo/ui/components/ui/input"
  import { Label } from "@repo/ui/components/ui/label"
  import { Spinner } from "@repo/ui/components/ui/spinner"
  import { cn } from "@repo/ui/lib/utils"

  import { Panel, PanelHeader } from "@/components/console/panel"
  import { isoDate } from "@/lib/format"

  import {
    invitationsQueries,
    ownerQueries,
  } from "../../../invitations/queries"
  import { useDirectAssign } from "../../../invitations/use-direct-assign"
  import { useInviteOwner } from "../../../invitations/use-invite-owner"
  import { useRemoveOwner } from "../../../invitations/use-remove-owner"
  import { useRevokeInvitation } from "../../../invitations/use-revoke-invitation"
  import { useToggleSuspension } from "../../../invitations/use-toggle-suspension"
  import { setupProgress } from "../../lib/derive"

  function Step({
    done,
    next,
    label,
    hint,
  }: {
    done: boolean
    next?: boolean
    label: string
    hint: string
  }) {
    return (
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
        <div
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : next
                ? "border-dashed border-primary text-primary"
                : "border-border"
          )}
        >
          {done ? <Check className="size-3.5" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
    )
  }

  export function TabDevir({ r }: { r: RestaurantWithCounts }) {
    const setupDone = setupProgress(r).pct === 100
    const isLive = r.status === "ACTIVE"
    const [formMode, setFormMode] = useState<"email" | "direct">("email")

    const { data: owner, isPending: ownerPending } = useQuery(
      ownerQueries.byRestaurant(r.id)
    )
    const { data: invitations, isPending: invitationsPending } = useQuery(
      invitationsQueries.byRestaurant(r.id)
    )
    const isPending = ownerPending || invitationsPending

    const invite = useInviteOwner(r.id)
    const revoke = useRevokeInvitation(r.id)
    const removeOwner = useRemoveOwner(r.id)
    const toggleSuspension = useToggleSuspension(r.id)
    const directAssignMutation = useDirectAssign(r.id)

    const pending = invitations?.find((i) => i.status === "PENDING")

    const {
      register,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<InviteOwnerInput>({
      resolver: zodResolver(inviteOwnerSchema),
      defaultValues: { email: "" },
    })

    const [directEmail, setDirectEmail] = useState("")

    function onEmailSubmit(values: InviteOwnerInput) {
      invite.mutate(values.email, { onSuccess: () => reset() })
    }

    function onDirectSubmit(e: React.FormEvent) {
      e.preventDefault()
      directAssignMutation.mutate(directEmail, {
        onSuccess: () => setDirectEmail(""),
      })
    }

    const tempPassword = directAssignMutation.data?.tempPassword ?? null

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <h2 className="mb-3 text-[15px] font-semibold">Müşteriye devir</h2>

          <div className="mb-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-[13px] leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Kurulum tamamlandıktan sonra restoran sahibini davet et. Sahip
              kendi panelinden menü ve masaları yönetir; geliştirici erişimi
              korunur.
            </p>
          </div>

          {isPending ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <Spinner className="size-4" /> Yükleniyor…
            </div>
          ) : owner && owner.suspended ? (
            /* ── Suspended owner ── */
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Pause className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {owner.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Erişim askıya alındı
                  </div>
                </div>
                <Badge variant="secondary">Askıda</Badge>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggleSuspension.isPending}
                  onClick={() => toggleSuspension.mutate(false)}
                >
                  {toggleSuspension.isPending ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Erişimi aç
                </Button>
              </div>
            </div>
          ) : owner ? (
            /* ── Active owner ── */
            <div className="rounded-xl border border-border bg-card p-4">
              {tempPassword ? (
                <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                      Geçici şifre — bir kez gösterilir
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-amber-100 px-2 py-1 font-mono text-sm text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                        {tempPassword}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          navigator.clipboard.writeText(tempPassword)
                        }
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Sahibe güvenli bir kanaldan iletiniz.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => directAssignMutation.reset()}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {owner.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {owner.directlyAssigned
                      ? "Doğrudan atandı"
                      : "Davet kabul edildi"}
                  </div>
                </div>
                <Badge variant="secondary">Sahip atandı</Badge>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={toggleSuspension.isPending}
                  onClick={() => toggleSuspension.mutate(true)}
                >
                  {toggleSuspension.isPending ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <Pause className="size-4" />
                  )}
                  Askıya al
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button variant="ghost" size="sm" />}
                  >
                    <UserX className="size-4" />
                    Sahipliği kaldır
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sahibi kaldır</AlertDialogTitle>
                      <AlertDialogDescription>
                        {owner.email} adresinin sahip erişimi kaldırılacak.
                        Gerekirse yeni bir sahip davet edebilirsin.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => removeOwner.mutate()}
                        disabled={removeOwner.isPending}
                        className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                      >
                        {removeOwner.isPending ? (
                          <Spinner className="size-3.5" />
                        ) : null}
                        Kaldır
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : pending ? (
            /* ── Pending email invitation ── */
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Clock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {pending.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Davet beklemede · {isoDate(pending.expiresAt)} tarihinde
                    sona erer
                  </div>
                </div>
                <Badge variant="secondary">Beklemede</Badge>
              </div>
              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={invite.isPending}
                  onClick={() => invite.mutate(pending.email)}
                >
                  <RotateCw className="size-4" />
                  Yeniden gönder
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(pending.id)}
                >
                  <X className="size-4" />
                  İptal et
                </Button>
              </div>
            </div>
          ) : (
            /* ── No owner: email invite / direct assign form ── */
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Users className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Sahip atanmadı</div>
                  <div className="text-xs text-muted-foreground">
                    {setupDone
                      ? "Sahibi e-posta ile davet et veya doğrudan ata"
                      : "Önce kurulumu tamamla"}
                  </div>
                </div>
              </div>

              {/* Form toggle */}
              <div className="mb-3 flex gap-1 rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setFormMode("email")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    formMode === "email"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Mail className="size-3.5" />
                  E-posta ile davet
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode("direct")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    formMode === "direct"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="size-3.5" />
                  Doğrudan ata
                </button>
              </div>

              {formMode === "email" ? (
                <form
                  onSubmit={handleSubmit(onEmailSubmit)}
                  noValidate
                  className="flex flex-col gap-1.5"
                >
                  <Label htmlFor="owner-email">Sahip e-postası</Label>
                  <div className="flex gap-2">
                    <Input
                      id="owner-email"
                      type="email"
                      autoComplete="off"
                      placeholder="sahip@ornek.com"
                      disabled={!setupDone || invite.isPending}
                      aria-invalid={!!errors.email}
                      {...register("email")}
                    />
                    <Button
                      type="submit"
                      disabled={!setupDone || invite.isPending}
                      className="shrink-0"
                    >
                      {invite.isPending ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                      Sahip davet et
                    </Button>
                  </div>
                  {errors.email ? (
                    <p className="text-xs text-destructive">
                      Geçerli bir e-posta gir.
                    </p>
                  ) : null}
                </form>
              ) : (
                <form
                  onSubmit={onDirectSubmit}
                  noValidate
                  className="flex flex-col gap-1.5"
                >
                  <Label htmlFor="direct-email">Sahip e-postası</Label>
                  <div className="flex gap-2">
                    <Input
                      id="direct-email"
                      type="email"
                      autoComplete="off"
                      placeholder="sahip@ornek.com"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      disabled={!setupDone || directAssignMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={
                        !setupDone ||
                        !directEmail ||
                        directAssignMutation.isPending
                      }
                      className="shrink-0"
                    >
                      {directAssignMutation.isPending ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Zap className="size-4" />
                      )}
                      Ata
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hesap yoksa geçici şifre oluşturulur.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Panel>
            <PanelHeader title="Devir adımları" />
            <div className="flex flex-col">
              <Step
                done={setupDone}
                next={!setupDone}
                label="Kurulum tamamlandı"
                hint="Profil, kat planı, menü, QR"
              />
              <Step
                done={!!owner || !!pending}
                next={setupDone && !owner && !pending}
                label="Sahip belirlendi"
                hint="E-posta daveti veya doğrudan atama"
              />
              <Step
                done={!!owner}
                next={!!pending}
                label="Erişim aktif"
                hint="Sahip panele erişebilir"
              />
              <Step
                done={isLive}
                label="Yayına alındı"
                hint="Müşteri menüsü erişilebilir"
              />
            </div>
          </Panel>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 7: Typecheck**

  ```bash
  pnpm --filter admin typecheck
  ```

  Expected: exits 0 with no errors.

- [ ] **Step 8: Run all API tests**

  ```bash
  pnpm --filter api test
  ```

  Expected: all 173+ tests pass.

- [ ] **Step 9: Commit**

  ```bash
  git add apps/admin/features/invitations/api.ts \
    apps/admin/features/invitations/queries.ts \
    apps/admin/features/invitations/use-direct-assign.ts \
    apps/admin/features/invitations/use-toggle-suspension.ts \
    apps/admin/features/invitations/use-remove-owner.ts \
    apps/admin/features/restaurants/components/detail/tab-devir.tsx
  git commit -m "feat(admin): direct owner assignment and suspension toggle in Devir tab"
  ```
