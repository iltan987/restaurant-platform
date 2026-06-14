import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { RestaurantAccessGuard } from "../src/auth/restaurant-access.guard"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Areas (e2e)", () => {
  let app: INestApplication<App>
  const http = () => app.getHttpServer()

  const seed = async (name = "Kose") => {
    const r = (await request(http()).post("/api/restaurants").send({ name }))
      .body
    return {
      restaurant: r,
      floorId: fakePrisma.__stores.floors[0]!.id,
      areaId: fakePrisma.__stores.areas[0]!.id,
    }
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

  it("lists areas as a paginated envelope (default area present)", async () => {
    const { restaurant } = await seed()
    const res = await request(http())
      .get(`/api/restaurants/${restaurant.slug}/areas`)
      .expect(200)
    expect(res.body).toMatchObject({ total: 1, page: 1, pageSize: 200 })
    expect(res.body.items[0]).toMatchObject({ name: "Genel" })
  })

  it("creates an area; rejects a duplicate name within the floor (AREA_NAME_TAKEN)", async () => {
    const { floorId } = await seed()
    await request(http())
      .post(`/api/floors/${floorId}/areas`)
      .send({ name: "Teras" })
      .expect(201)
    const dup = await request(http())
      .post(`/api/floors/${floorId}/areas`)
      .send({ name: "Teras" })
      .expect(409)
    expect(dup.body).toMatchObject({ code: ErrorCode.AREA_NAME_TAKEN })
  })

  it("returns FLOOR_NOT_FOUND creating under an unknown floor", async () => {
    const res = await request(http())
      .post("/api/floors/nope/areas")
      .send({ name: "X" })
      .expect(404)
    expect(res.body).toMatchObject({ code: ErrorCode.FLOOR_NOT_FOUND })
  })

  it("blocks deleting an area that still has tables (AREA_NOT_EMPTY)", async () => {
    const { areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "1" })
      .expect(201)
    const res = await request(http()).delete(`/api/areas/${areaId}`).expect(409)
    expect(res.body).toMatchObject({ code: ErrorCode.AREA_NOT_EMPTY })
  })

  it("cascade-deletes a non-empty area with ?cascade=true (tables go)", async () => {
    const { areaId } = await seed()
    await request(http())
      .post(`/api/areas/${areaId}/tables`)
      .send({ label: "1" })
      .expect(201)
    await request(http())
      .delete(`/api/areas/${areaId}?cascade=true`)
      .expect(204)
    expect(fakePrisma.__stores.tables).toHaveLength(0)
  })

  it("deletes an empty area (204)", async () => {
    const { floorId } = await seed()
    const created = await request(http())
      .post(`/api/floors/${floorId}/areas`)
      .send({ name: "Pencere" })
    await request(http()).delete(`/api/areas/${created.body.id}`).expect(204)
  })
})
