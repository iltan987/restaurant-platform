import { INestApplication } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { App } from "supertest/types"

import { ErrorCode } from "@repo/schemas"

import { AppModule } from "../src/app.module"
import { PrismaService } from "../src/prisma/prisma.service"
import { fakePrisma } from "./fake-prisma"

describe("Restaurants (e2e)", () => {
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

  describe("POST /api/restaurants", () => {
    it("creates an INACTIVE / IN_PROGRESS restaurant with a default floor + area", async () => {
      const res = await request(http())
        .post("/api/restaurants")
        .send({ name: "Test Restaurant" })
        .expect(201)

      expect(res.body).toMatchObject({
        name: "Test Restaurant",
        slug: "test-restaurant",
        status: "INACTIVE",
        onboardingStatus: "IN_PROGRESS",
      })
      expect(fakePrisma.__stores.floors).toEqual([
        expect.objectContaining({ name: "Zemin Kat" }),
      ])
      expect(fakePrisma.__stores.areas).toEqual([
        expect.objectContaining({ name: "Genel" }),
      ])
    })

    it("returns 400 with VALIDATION_ERROR on an invalid body", async () => {
      const res = await request(http())
        .post("/api/restaurants")
        .send({})
        .expect(400)
      expect(res.body).toMatchObject({ code: ErrorCode.VALIDATION_ERROR })
    })

    it("returns 409 with SLUG_TAKEN on a unique-constraint race", async () => {
      fakePrisma.__forceP2002(true)
      const res = await request(http())
        .post("/api/restaurants")
        .send({ name: "Race Condition" })
        .expect(409)
      expect(res.body).toMatchObject({ code: ErrorCode.SLUG_TAKEN })
    })
  })

  describe("GET /api/restaurants", () => {
    it("returns a paginated envelope", async () => {
      await request(http()).post("/api/restaurants").send({ name: "One" })
      await request(http()).post("/api/restaurants").send({ name: "Two" })

      const res = await request(http()).get("/api/restaurants").expect(200)
      expect(res.body).toMatchObject({ total: 2, page: 1, pageSize: 20 })
      expect(res.body.items).toHaveLength(2)
    })
  })

  describe("GET /api/restaurants/:slug", () => {
    it("returns 200 with the restaurant when it exists", async () => {
      await request(http())
        .post("/api/restaurants")
        .send({ name: "Found Restaurant" })
      const res = await request(http())
        .get("/api/restaurants/found-restaurant")
        .expect(200)
      expect(res.body).toMatchObject({
        slug: "found-restaurant",
        onboardingStatus: "IN_PROGRESS",
      })
    })

    it("returns 404 with RESTAURANT_NOT_FOUND when the slug does not exist", async () => {
      const res = await request(http())
        .get("/api/restaurants/does-not-exist")
        .expect(404)
      expect(res.body).toMatchObject({ code: ErrorCode.RESTAURANT_NOT_FOUND })
    })
  })

  describe("PATCH /api/restaurants/:id/status", () => {
    it("rejects going live with no tables (GO_LIVE_REQUIRES_TABLE)", async () => {
      const created = await request(http())
        .post("/api/restaurants")
        .send({ name: "Empty Venue" })

      const res = await request(http())
        .patch(`/api/restaurants/${created.body.id}/status`)
        .send({ status: "ACTIVE" })
        .expect(409)
      expect(res.body).toMatchObject({ code: ErrorCode.GO_LIVE_REQUIRES_TABLE })
    })

    it("goes live once the restaurant has a table", async () => {
      const created = await request(http())
        .post("/api/restaurants")
        .send({ name: "Live Venue" })
      const areaId = fakePrisma.__stores.areas[0]!.id
      await request(http())
        .post(`/api/areas/${areaId}/tables`)
        .send({ label: "1" })
        .expect(201)

      const res = await request(http())
        .patch(`/api/restaurants/${created.body.id}/status`)
        .send({ status: "ACTIVE" })
        .expect(200)
      expect(res.body).toMatchObject({ status: "ACTIVE" })
    })
  })

  describe("PATCH /api/restaurants/:id/onboarding", () => {
    it("marks onboarding COMPLETED without activating", async () => {
      const created = await request(http())
        .post("/api/restaurants")
        .send({ name: "Skip Venue" })

      const res = await request(http())
        .patch(`/api/restaurants/${created.body.id}/onboarding`)
        .send({ onboardingStatus: "COMPLETED" })
        .expect(200)
      expect(res.body).toMatchObject({
        onboardingStatus: "COMPLETED",
        status: "INACTIVE",
      })
    })
  })
})
