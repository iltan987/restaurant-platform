import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { RestaurantAccessGuard } from "../src/auth/restaurant-access.guard"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Public menu (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const createRestaurant = async (name: string) =>
    (await request(http()).post("/api/restaurants").send({ name })).body
  const createCategory = async (rid: string, name: string) =>
    (
      await request(http())
        .post(`/api/restaurants/${rid}/categories`)
        .send({ name })
    ).body
  const addItem = async (cid: string, name: string, priceMinor: number) =>
    (
      await request(http())
        .post(`/api/categories/${cid}/items`)
        .send({ name, priceMinor })
    ).body
  // The status route requires ≥1 table; this suite tests the menu surface, not
  // go-live, so flip the stored status directly.
  const activate = (rid: string) => {
    fakePrisma.__stores.restaurants.find((r) => r.id === rid)!.status = "ACTIVE"
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideGuard(RestaurantAccessGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix("api")
    await app.init()
  })

  beforeEach(() => fakePrisma.__reset())
  afterAll(async () => app.close())

  it("serves the menu tree by slug for an ACTIVE restaurant", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    await addItem(c.id, "Çay", 1000)
    activate(r.id)

    const res = await request(http())
      .get(`/api/menu/by-slug/${r.slug}`)
      .expect(200)

    expect(res.body.restaurant).toMatchObject({ slug: r.slug, name: "Kose" })
    expect(res.body.categories).toHaveLength(1)
    expect(res.body.categories[0].items[0]).toMatchObject({
      name: "Çay",
      priceMinor: 1000,
      orderableNow: { ok: true },
    })
  })

  it("returns RESTAURANT_NOT_FOUND for a non-ACTIVE restaurant", async () => {
    const r = await createRestaurant("Kose")
    await createCategory(r.id, "İçecekler")
    // left INACTIVE on purpose

    const res = await request(http())
      .get(`/api/menu/by-slug/${r.slug}`)
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("returns RESTAURANT_NOT_FOUND for an unknown slug", async () => {
    const res = await request(http()).get("/api/menu/by-slug/ghost").expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("excludes hidden categories from the public tree", async () => {
    const r = await createRestaurant("Kose")
    const shown = await createCategory(r.id, "İçecekler")
    const hidden = await createCategory(r.id, "Gizli")
    await addItem(shown.id, "Çay", 1000)
    await request(http())
      .patch(`/api/categories/${hidden.id}`)
      .send({ isHidden: true })
      .expect(200)
    activate(r.id)

    const res = await request(http())
      .get(`/api/menu/by-slug/${r.slug}`)
      .expect(200)
    expect(res.body.categories).toHaveLength(1)
    expect(res.body.categories[0].name).toBe("İçecekler")
  })

  it("reports OUT_OF_STOCK items as not orderable but still lists them", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    const item = await addItem(c.id, "Çay", 1000)
    await request(http())
      .patch(`/api/menu-items/${item.id}`)
      .send({ inStock: false })
      .expect(200)
    activate(r.id)

    const res = await request(http())
      .get(`/api/menu/by-slug/${r.slug}`)
      .expect(200)
    expect(res.body.categories[0].items[0].orderableNow).toEqual({
      ok: false,
      reason: "OUT_OF_STOCK",
    })
  })
})
