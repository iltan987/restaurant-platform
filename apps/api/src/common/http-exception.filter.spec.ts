import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common"
import { ErrorCode } from "@repo/schemas"
import { HttpExceptionFilter } from "./http-exception.filter"

function makeHost() {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: "GET", url: "/test" }),
    }),
  } as unknown as ArgumentsHost
  return { host, json, status }
}

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    filter = new HttpExceptionFilter()
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it("maps a structured ConflictException to its domain code and message", () => {
    const { host, status, json } = makeHost()
    const exception = new ConflictException({
      code: ErrorCode.SLUG_TAKEN,
      message: "Slug is already taken",
    })

    filter.catch(exception, host)

    expect(status).toHaveBeenCalledWith(409)
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: ErrorCode.SLUG_TAKEN,
      message: "Slug is already taken",
    })
  })

  it("maps a plain NotFoundException to NOT_FOUND", () => {
    const { host, status, json } = makeHost()

    filter.catch(new NotFoundException("Resource not found"), host)

    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: ErrorCode.NOT_FOUND,
        message: "Resource not found",
      })
    )
  })

  it("maps a plain BadRequestException to VALIDATION_ERROR", () => {
    const { host, status, json } = makeHost()

    filter.catch(new BadRequestException("Bad input"), host)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: ErrorCode.VALIDATION_ERROR,
      })
    )
  })

  it("maps a non-HttpException Error to a 500 INTERNAL_ERROR", () => {
    const { host, status, json } = makeHost()

    filter.catch(new Error("something exploded"), host)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: ErrorCode.INTERNAL_ERROR,
      message: "something exploded",
    })
  })
})
