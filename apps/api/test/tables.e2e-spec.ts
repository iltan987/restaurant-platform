import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { RestaurantAccessGuard } from "../src/auth/restaurant-access.guard"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Tables (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const seed = async (name = "Kose") => {
    const r = (await request(http()).post("/api/restaurants").send({ name }))
      .body
    return { restaurant: r, areaId: fakePrisma.__stores.areas[0]!.id }
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

  it("creates a table; rejects a duplicate label with TABLE_LABEL_TAKEN", async () => {
    const { areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "5" })
      .expect(201)
    const dup = await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "5" })
      .expect(409)
    expect(dup.body).toMatchObject({ code: ErrorCode.TABLE_LABEL_TAKEN })
  })

  it("allows the same label on a different floor (uniqueness is per floor)", async () => {
    const { restaurant, areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "1" })
      .expect(201)

    // a second floor with its own area
    const floor = (
      await request(http())
        .post(`/api/restaurants/${restaurant.id}/floors`)
        .send({ name: "Üst Kat" })
    ).body
    const area2 = (
      await request(http())
        .post(`/api/floors/${floor.id}/areas`)
        .send({ name: "Teras" })
    ).body

    // same label "1" on the other floor is allowed
    await request(http())
      .post(`/api/areas/${area2.id}/tables`)
      .send({ label: "1" })
      .expect(201)
  })

  it("returns AREA_NOT_FOUND creating under an unknown area", async () => {
    const res = await request(http())
      .post("/api/areas/nope/tables")
      .send({ label: "1" })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.AREA_NOT_FOUND })
  })

  it("bulk-creates sequential labels", async () => {
    const { areaId } = await seed()
    const res = await request(http())
      .post(`/api/areas/${areaId}/tables/bulk`)
      .send({ count: 3 })
      .expect(201)
    expect(res.body).toHaveLength(3)
    expect(res.body.map((t: { label: string }) => t.label)).toEqual([
      "1",
      "2",
      "3",
    ])
  })

  it("aborts the whole bulk batch on a label collision (TABLE_LABEL_TAKEN)", async () => {
    const { areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "2" })
      .expect(201)
    const res = await request(http())
      .post(`/api/areas/${areaId}/tables/bulk`)
      .send({ count: 3 })
      .expect(409)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_LABEL_TAKEN })
    // only the single pre-existing table remains — batch did not partially apply
    expect(fakePrisma.__stores.tables).toHaveLength(1)
  })

  it("renames, sets shape, and reassigns a table's area via PATCH", async () => {
    const { restaurant, areaId } = await seed()
    const t = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "1" })
    ).body

    // a second area on the same floor to move into
    const area2 = (
      await request(http())
        .post(`/api/floors/${fakePrisma.__stores.floors[0]!.id}/areas`)
        .send({ name: "Teras" })
    ).body

    const res = await request(http())
      .patch(`/api/tables/${t.id}`)
      .send({ label: "VIP", shape: "ROUND", capacity: 6, areaId: area2.id })
      .expect(200)
    expect(res.body).toMatchObject({
      id: t.id,
      label: "VIP",
      shape: "ROUND",
      capacity: 6,
      areaId: area2.id,
    })
    // confirm it now resolves under the restaurant with the new values
    const fetched = await request(http())
      .get(`/api/restaurants/${restaurant.slug}/tables/${t.id}`)
      .expect(200)
    expect(fetched.body).toMatchObject({ label: "VIP", areaId: area2.id })
  })

  it("rejects a rename that collides on the floor (TABLE_LABEL_TAKEN)", async () => {
    const { areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "1" })
    const t2 = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "2" })
    ).body
    const res = await request(http())
      .patch(`/api/tables/${t2.id}`)
      .send({ label: "1" })
      .expect(409)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_LABEL_TAKEN })
  })

  it("returns TABLE_NOT_FOUND patching an unknown table", async () => {
    await seed()
    const res = await request(http())
      .patch("/api/tables/nope")
      .send({ label: "x" })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
  })

  it("deletes a table (204); unknown table → TABLE_NOT_FOUND", async () => {
    const { areaId } = await seed()
    const t = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "1" })
    ).body
    await request(http()).delete(`/api/tables/${t.id}`).expect(204)
    expect(fakePrisma.__stores.tables).toHaveLength(0)
    const res = await request(http()).delete("/api/tables/nope").expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
  })

  it("resolves a single table by slug + id (200)", async () => {
    const { restaurant, areaId } = await seed()
    const t = (
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "7" })
    ).body
    const res = await request(http())
      .get(`/api/restaurants/${restaurant.slug}/tables/${t.id}`)
      .expect(200)
    expect(res.body).toMatchObject({ id: t.id, label: "7", areaId })
  })

  it("returns TABLE_NOT_FOUND for an unknown table id", async () => {
    const { restaurant } = await seed()
    const res = await request(http())
      .get(`/api/restaurants/${restaurant.slug}/tables/nope`)
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.TABLE_NOT_FOUND })
  })

  it("returns RESTAURANT_NOT_FOUND for an unknown slug", async () => {
    const res = await request(http())
      .get("/api/restaurants/nope/tables/whatever")
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
  })

  it("lists tables as a paginated envelope", async () => {
    const { restaurant, areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables/bulk`)
      .send({ count: 2 })
    const res = await request(http())
      .get(`/api/restaurants/${restaurant.slug}/tables`)
      .expect(200)
    expect(res.body).toMatchObject({ total: 2, page: 1, pageSize: 200 })
    expect(res.body.items).toHaveLength(2)
  })
})
