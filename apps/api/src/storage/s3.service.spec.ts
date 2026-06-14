const mockSend = jest.fn()

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ kind: "put", ...input })),
  HeadObjectCommand: jest.fn((input) => ({ kind: "head", ...input })),
  DeleteObjectCommand: jest.fn((input) => ({ kind: "delete", ...input })),
}))

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}))

import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { S3Service } from "./s3.service"

const getSignedUrlMock = getSignedUrl as jest.Mock

// S3Service reads the validated `env` (a live `process.env` view under test).
const S3_ENV = {
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "menu-media",
  S3_ACCESS_KEY_ID: "x",
  S3_SECRET_ACCESS_KEY: "y",
  MEDIA_PUBLIC_BASE_URL: "http://localhost:9000/menu-media",
}

describe("S3Service", () => {
  let service: S3Service
  const ORIGINAL_ENV = { ...process.env }

  beforeAll(() => Object.assign(process.env, S3_ENV))
  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  beforeEach(() => {
    jest.clearAllMocks()
    service = new S3Service()
  })

  it("presigns a PUT URL", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/put")
    const url = await service.presignPut("items/i1/abc", "image/png", 300)
    expect(url).toBe("https://signed.example/put")
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1)
  })

  it("HEAD returns metadata when the object exists", async () => {
    mockSend.mockResolvedValue({
      ContentLength: 1234,
      ContentType: "image/png",
    })
    expect(await service.head("k")).toEqual({
      contentLength: 1234,
      contentType: "image/png",
    })
  })

  it("HEAD returns null when the object is missing (404)", async () => {
    mockSend.mockRejectedValue({ $metadata: { httpStatusCode: 404 } })
    expect(await service.head("k")).toBeNull()
  })

  it("HEAD rethrows unexpected errors", async () => {
    mockSend.mockRejectedValue(new Error("boom"))
    await expect(service.head("k")).rejects.toThrow("boom")
  })

  it("deletes via the client", async () => {
    mockSend.mockResolvedValue({})
    await service.delete("k")
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it("composes the public URL from the key", () => {
    expect(service.publicUrl("items/i1/abc")).toBe(
      "http://localhost:9000/menu-media/items/i1/abc"
    )
  })
})
