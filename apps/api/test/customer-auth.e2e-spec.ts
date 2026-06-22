import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

/**
 * Customer audience — optional sign-in (US4, SC-004 / SC-005 / FR-017–021).
 *
 * `CustomerAuthGuard` is non-gating (`optional: true`) so no route blocks
 * anonymous browsing; it only attaches `req.auth` when a customer session
 * exists. This suite verifies the storefront contract that matters most:
 * anonymous diners can reach every public endpoint (SC-004).
 *
 * Better Auth's own customer sign-in behaviors — Google OAuth, email-OTP
 * link+code delivery, Google+email account deduplication (FR-017–021), and
 * the no-enumeration guarantee (FR-026 — unknown vs known address yields the
 * same response shape) — are configured on `customerAuth` and verified
 * against a live server (the package is ESM-only and can't load under Jest's
 * CommonJS loader; see test/better-auth.mock.ts).
 */
describe("Customer auth (e2e)", () => {
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

  beforeEach(() => fakePrisma.__reset())
  afterAll(async () => app.close())

  describe("anonymous storefront access (SC-004)", () => {
    it("allows anonymous access to the restaurant lookup (404, not 401)", async () => {
      await request(http()).get("/api/restaurants/ghost-slug").expect(404)
    })

    it("allows anonymous access to the single-table QR lookup (404, not 401)", async () => {
      await request(http())
        .get("/api/restaurants/ghost-slug/tables/t1")
        .expect(404)
    })

    it("allows anonymous access to the public menu route (404, not 401)", async () => {
      await request(http()).get("/api/menu/by-slug/ghost-slug").expect(404)
    })

    it("returns the restaurant and its menu tree for a real ACTIVE restaurant", async () => {
      // Seed a restaurant + category + item using the fakePrisma write path.
      const { __stores } = fakePrisma
      __stores.restaurants.push({
        id: "r1",
        name: "Kahve",
        slug: "kahve",
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      __stores.categories.push({
        id: "cat1",
        restaurantId: "r1",
        name: "İçecekler",
        position: 0,
        isHidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      __stores.menuItems.push({
        id: "item1",
        restaurantId: "r1",
        categoryId: "cat1",
        name: "Filtre Kahve",
        priceMinor: 2500,
        inStock: true,
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(http())
        .get("/api/menu/by-slug/kahve")
        .expect(200)
      expect(res.body.restaurant).toMatchObject({ slug: "kahve" })
      expect(res.body.categories).toHaveLength(1)
      expect(res.body.categories[0].items).toHaveLength(1)
    })
  })
})
