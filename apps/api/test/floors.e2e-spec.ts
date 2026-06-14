import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { RestaurantAccessGuard } from "../src/auth/restaurant-access.guard"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Floors (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const createRestaurant = async (name: string) =>
    (await request(http()).post("/api/restaurants").send({ name })).body

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

  it("lists floors as a paginated envelope (default floor present)", async () => {
    const r = await createRestaurant("Kose")
    const res = await request(http())
      .get(`/api/restaurants/${r.slug}/floors`)
      .expect(200)
    expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 200 })
    expect(res.body.items[0]).toMatchObject({ name: "Zemin Kat" })
  })

  it("returns RESTAURANT_NOT_FOUND listing an unknown slug", async () => {
    const res = await request(http())
      .get("/api/restaurants/nope/floors")
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("creates a floor, and rejects a duplicate name with FLOOR_NAME_TAKEN", async () => {
    const r = await createRestaurant("Kose")
    await request(http())
      .post(`/api/restaurants/${r.id}/floors`)
      .send({ name: "1. Kat" })
      .expect(201)
    const dup = await request(http())
      .post(`/api/restaurants/${r.id}/floors`)
      .send({ name: "1. Kat" })
      .expect(409)
    expect(dup.body).toMatchObject({ code: ErrorCode.FLOOR_NAME_TAKEN })
  })

  it("returns RESTAURANT_NOT_FOUND creating under an unknown restaurant", async () => {
    const res = await request(http())
      .post("/api/restaurants/nope/floors")
      .send({ name: "X" })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("blocks deleting a floor that still has areas (FLOOR_NOT_EMPTY)", async () => {
    await createRestaurant("Kose")
    const defaultFloorId = fakePrisma.__stores.floors[0]!.id
    const res = await request(http())
      .delete(`/api/floors/${defaultFloorId}`)
      .expect(409)
    expect(res.body).toMatchObject({ code: ErrorCode.FLOOR_NOT_EMPTY })
  })

  it("deletes an empty floor (204)", async () => {
    const r = await createRestaurant("Kose")
    const created = await request(http())
      .post(`/api/restaurants/${r.id}/floors`)
      .send({ name: "Boş Kat" })
    await request(http()).delete(`/api/floors/${created.body.id}`).expect(204)
  })

  it("saves a floor's canvas layout and persists normalized positions", async () => {
    await createRestaurant("Kose")
    const floorId = fakePrisma.__stores.floors[0]!.id
    const areaId = fakePrisma.__stores.areas[0]!.id
    const t1 = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "1" })
    ).body
    const t2 = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "2" })
    ).body

    const res = await request(http())
      .put(`/api/floors/${floorId}/layout`)
      .send({
        positions: [
          { tableId: t1.id, x: 0.2, y: 0.4 },
          { tableId: t2.id, x: 0.8, y: 0.6 },
        ],
      })
      .expect(200)

    expect(res.body).toHaveLength(2)
    const saved = fakePrisma.__stores.tables.find((t) => t.id === t1.id)!
    expect(saved).toMatchObject({ positionX: 0.2, positionY: 0.4 })
  })

  it("returns FLOOR_NOT_FOUND saving layout for an unknown floor", async () => {
    const res = await request(http())
      .put("/api/floors/nope/layout")
      .send({ positions: [] })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.FLOOR_NOT_FOUND })
  })

  it("returns TABLE_NOT_FOUND when a position targets a table off the floor", async () => {
    await createRestaurant("Kose")
    const floorId = fakePrisma.__stores.floors[0]!.id
    const res = await request(http())
      .put(`/api/floors/${floorId}/layout`)
      .send({ positions: [{ tableId: "ghost1", x: 0.5, y: 0.5 }] })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
  })

  it("cascade-deletes a non-empty floor with ?cascade=true (areas + tables go)", async () => {
    const r = await createRestaurant("Kose")
    const defaultFloorId = fakePrisma.__stores.floors[0]!.id
    const areaId = fakePrisma.__stores.areas[0]!.id
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "1" })
      .expect(201)

    await request(http())
      .delete(`/api/floors/${defaultFloorId}?cascade=true`)
      .expect(204)

    // the floor, its area and table are all gone
    expect(fakePrisma.__stores.floors).toHaveLength(0)
    expect(fakePrisma.__stores.areas).toHaveLength(0)
    expect(fakePrisma.__stores.tables).toHaveLength(0)
    const list = await request(http())
      .get(`/api/restaurants/${r.slug}/tables`)
      .expect(200)
    expect(list.body.total).toBe(0)
  })
})
