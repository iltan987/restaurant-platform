import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"

// ---------------------------------------------------------------------------
// In-memory Prisma fake — no real database required
// ---------------------------------------------------------------------------

type RestaurantRow = {
  id: string
  name: string
  slug: string
  status: "ACTIVE" | "INACTIVE"
  onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
  createdAt: Date
  updatedAt: Date
}

const restaurants: RestaurantRow[] = []
const floors: Array<{ id: string; restaurantId: string; name: string }> = []
const areas: Array<{ id: string; floorId: string; name: string }> = []
let seq = 0
// Simulates a unique-constraint race (P2002) on the next restaurant insert,
// the only path that surfaces SLUG_TAKEN (service pre-uniquifies otherwise).
let forceP2002 = false

// The delegates available inside an interactive `$transaction(cb)` callback.
const txClient = {
  restaurant: {
    create({ data }: { data: { name: string; slug: string } }) {
      if (forceP2002 || restaurants.some((r) => r.slug === data.slug)) {
        return Promise.reject({ code: "P2002" })
      }
      const row: RestaurantRow = {
        id: `rest-${++seq}`,
        name: data.name,
        slug: data.slug,
        status: "INACTIVE",
        onboardingStatus: "IN_PROGRESS",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      restaurants.push(row)
      return Promise.resolve(row)
    },
  },
  floor: {
    create({ data }: { data: { restaurantId: string; name: string } }) {
      const row = { id: `floor-${++seq}`, ...data }
      floors.push(row)
      return Promise.resolve(row)
    },
  },
  area: {
    create({ data }: { data: { floorId: string; name: string } }) {
      const row = { id: `area-${++seq}`, ...data }
      areas.push(row)
      return Promise.resolve(row)
    },
  },
}

const fakePrismaService = {
  restaurant: {
    findMany({
      skip = 0,
      take = 20,
    }: { skip?: number; take?: number; orderBy?: unknown } = {}) {
      const sorted = [...restaurants].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )
      return Promise.resolve(sorted.slice(skip, skip + take))
    },
    count() {
      return Promise.resolve(restaurants.length)
    },
    findUnique({ where }: { where: { slug: string } }) {
      return Promise.resolve(
        restaurants.find((r) => r.slug === where.slug) ?? null
      )
    },
  },
  $transaction(cb: (tx: typeof txClient) => unknown) {
    return Promise.resolve(cb(txClient))
  },
}

// ---------------------------------------------------------------------------

describe("Restaurants (e2e)", () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fakePrismaService)
      .compile()

    app = moduleFixture.createNestApplication()
    // Mirror the global prefix set in main.ts
    app.setGlobalPrefix("api")
    await app.init()
  })

  beforeEach(() => {
    // Reset the in-memory store before each test so cases are independent
    restaurants.length = 0
    floors.length = 0
    areas.length = 0
    seq = 0
    forceP2002 = false
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/restaurants", () => {
    it("creates an INACTIVE / IN_PROGRESS restaurant with a default floor + area", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "Test Restaurant" })
        .expect(201)

      expect(response.body).toMatchObject({
        name: "Test Restaurant",
        slug: "test-restaurant",
        status: "INACTIVE",
        onboardingStatus: "IN_PROGRESS",
      })
      // Default floor + area were provisioned in the same transaction
      expect(floors).toEqual([expect.objectContaining({ name: "Zemin Kat" })])
      expect(areas).toEqual([expect.objectContaining({ name: "Genel" })])
    })

    it("returns 400 with VALIDATION_ERROR on an invalid body", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_ERROR })
    })

    it("returns 409 with SLUG_TAKEN on a unique-constraint race", async () => {
      forceP2002 = true

      const response = await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "Race Condition" })
        .expect(409)

      expect(response.body).toMatchObject({ code: ErrorCode.SLUG_TAKEN })
    })
  })

  describe("GET /api/restaurants", () => {
    it("returns a paginated envelope", async () => {
      await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "One" })
      await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "Two" })

      const response = await request(app.getHttpServer())
        .get("/api/restaurants")
        .expect(200)

      expect(response.body).toMatchObject({ total: 2, page: 1, pageSize: 20 })
      expect(Array.isArray(response.body.items)).toBe(true)
      expect(response.body.items).toHaveLength(2)
    })
  })

  describe("GET /api/restaurants/:slug", () => {
    it("returns 200 with the restaurant when it exists", async () => {
      await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "Found Restaurant" })

      const response = await request(app.getHttpServer())
        .get("/api/restaurants/found-restaurant")
        .expect(200)

      expect(response.body).toMatchObject({
        slug: "found-restaurant",
        onboardingStatus: "IN_PROGRESS",
      })
    })

    it("returns 404 with RESTAURANT_NOT_FOUND when the slug does not exist", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/restaurants/does-not-exist")
        .expect(404)

      expect(response.body).toMatchObject({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
      })
    })
  })
})
