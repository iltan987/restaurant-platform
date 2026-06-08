import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
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
