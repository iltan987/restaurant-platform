import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
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
