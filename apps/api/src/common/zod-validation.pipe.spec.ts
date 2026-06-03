import { BadRequestException } from "@nestjs/common"
import { createRestaurantSchema, ErrorCode } from "@repo/schemas"
import { ZodValidationPipe } from "./zod-validation.pipe"

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(createRestaurantSchema)

  it("passes valid input through unchanged", () => {
    const input = { name: "Burger Joint" }
    expect(pipe.transform(input)).toEqual(input)
  })

  it("passes valid input that includes an optional slug", () => {
    const input = { name: "Burger Joint", slug: "burger-joint" }
    expect(pipe.transform(input)).toEqual(input)
  })

  it("throws BadRequestException(VALIDATION_ERROR) with issues on invalid input", () => {
    const err = (() => {
      try {
        pipe.transform({})
      } catch (e) {
        return e
      }
    })()

    expect(err).toBeInstanceOf(BadRequestException)

    const body = (err as BadRequestException).getResponse() as Record<
      string,
      unknown
    >
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(Array.isArray(body.issues)).toBe(true)
    expect((body.issues as unknown[]).length).toBeGreaterThan(0)
  })
})
