import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { RestaurantAccessGuard } from "../src/auth/restaurant-access.guard"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Menu categories & items (e2e)", () => {
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

  it("creates a category and lists it (ordered) by slug", async () => {
    const r = await createRestaurant("Kose")
    await request(http())
      .post(`/api/restaurants/${r.id}/categories`)
      .send({ name: "İçecekler" })
      .expect(201)
    const list = await request(http())
      .get(`/api/restaurants/${r.slug}/categories`)
      .expect(200)
    expect(list.body).toHaveLength(1)
    expect(list.body[0]).toMatchObject({ name: "İçecekler", position: 0 })
  })

  it("rejects a duplicate category name with CATEGORY_NAME_TAKEN", async () => {
    const r = await createRestaurant("Kose")
    await createCategory(r.id, "İçecekler")
    const dup = await request(http())
      .post(`/api/restaurants/${r.id}/categories`)
      .send({ name: "İçecekler" })
      .expect(409)
    expect(dup.body).toMatchObject({ code: ErrorCode.CATEGORY_NAME_TAKEN })
  })

  it("adds an item with a price under a category and lists it", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    const item = await request(http())
      .post(`/api/categories/${c.id}/items`)
      .send({ name: "Çay", priceMinor: 1000 })
      .expect(201)
    expect(item.body).toMatchObject({
      name: "Çay",
      priceMinor: 1000,
      inStock: true,
      categoryId: c.id,
      restaurantId: r.id,
    })
    const list = await request(http())
      .get(`/api/categories/${c.id}/items`)
      .expect(200)
    expect(list.body).toHaveLength(1)
  })

  it("toggles an item out-of-stock without removing it", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    const item = (
      await request(http())
        .post(`/api/categories/${c.id}/items`)
        .send({ name: "Çay", priceMinor: 1000 })
    ).body
    const updated = await request(http())
      .patch(`/api/menu-items/${item.id}`)
      .send({ inStock: false })
      .expect(200)
    expect(updated.body).toMatchObject({ inStock: false })
  })

  it("hides a category via PATCH", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    const updated = await request(http())
      .patch(`/api/categories/${c.id}`)
      .send({ isHidden: true })
      .expect(200)
    expect(updated.body).toMatchObject({ isHidden: true })
  })

  it("blocks deleting a non-empty category (CATEGORY_NOT_EMPTY)", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    await request(http())
      .post(`/api/categories/${c.id}/items`)
      .send({ name: "Çay", priceMinor: 1000 })
      .expect(201)
    const res = await request(http())
      .delete(`/api/categories/${c.id}`)
      .expect(409)
    expect(res.body).toMatchObject({ code: ErrorCode.CATEGORY_NOT_EMPTY })
  })

  it("deletes an emptied category (204) after its item is removed", async () => {
    const r = await createRestaurant("Kose")
    const c = await createCategory(r.id, "İçecekler")
    const item = (
      await request(http())
        .post(`/api/categories/${c.id}/items`)
        .send({ name: "Çay", priceMinor: 1000 })
    ).body
    await request(http()).delete(`/api/menu-items/${item.id}`).expect(204)
    await request(http()).delete(`/api/categories/${c.id}`).expect(204)
  })

  it("reorders categories and returns the new order", async () => {
    const r = await createRestaurant("Kose")
    const a = await createCategory(r.id, "A")
    const b = await createCategory(r.id, "B")
    const res = await request(http())
      .put(`/api/restaurants/${r.id}/categories/order`)
      .send({ ids: [b.id, a.id] })
      .expect(200)
    expect(res.body.map((c: { id: string }) => c.id)).toEqual([b.id, a.id])
    expect(res.body[0]).toMatchObject({ position: 0 })
  })

  it("returns RESTAURANT_NOT_FOUND listing categories for an unknown slug", async () => {
    const res = await request(http())
      .get("/api/restaurants/nope/categories")
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("returns CATEGORY_NOT_FOUND adding an item under an unknown category", async () => {
    const res = await request(http())
      .post("/api/categories/ghost/items")
      .send({ name: "X", priceMinor: 0 })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.CATEGORY_NOT_FOUND })
  })
})
