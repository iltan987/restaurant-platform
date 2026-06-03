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

const db: Array<{
  id: string
  name: string
  slug: string
  status: "ACTIVE" | "INACTIVE"
  createdAt: Date
  updatedAt: Date
}> = []
let seq = 0

const fakePrismaService = {
  restaurant: {
    create({ data }: { data: { name: string; slug: string } }) {
      const row = {
        id: `test-${++seq}`,
        name: data.name,
        slug: data.slug,
        status: "ACTIVE" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      db.push(row)
      return Promise.resolve(row)
    },
    findMany() {
      return Promise.resolve(
        [...db].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      )
    },
    findUnique({ where }: { where: { slug: string } }) {
      return Promise.resolve(db.find((r) => r.slug === where.slug) ?? null)
    },
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
    db.length = 0
    seq = 0
  })

  afterAll(async () => {
    await app.close()
  })

  describe("POST /api/restaurants", () => {
    it("creates a restaurant and returns 201 with the slug", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({ name: "Test Restaurant" })
        .expect(201)

      expect(response.body).toMatchObject({
        name: "Test Restaurant",
        slug: "test-restaurant",
      })
    })

    it("returns 400 with VALIDATION_ERROR on an invalid body", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/restaurants")
        .send({})
        .expect(400)

      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_ERROR })
    })
  })

  describe("GET /api/restaurants", () => {
    it("returns 200 with an array", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/restaurants")
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
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

      expect(response.body).toMatchObject({ slug: "found-restaurant" })
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
