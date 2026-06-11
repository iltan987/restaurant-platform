import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

export interface HeadResult {
  contentLength: number
  contentType: string
}

/**
 * S3-compatible object storage — MinIO in dev, Cloudflare R2 in prod, one code
 * path (env-selected, path-style addressing). The client + config are read
 * lazily so the app boots fine without S3 env when media isn't exercised.
 */
@Injectable()
export class S3Service {
  private _client?: S3Client

  constructor(private readonly config: ConfigService) {}

  private get client(): S3Client {
    if (!this._client) {
      this._client = new S3Client({
        endpoint: this.config.getOrThrow("S3_ENDPOINT"),
        region: this.config.getOrThrow("S3_REGION"),
        credentials: {
          accessKeyId: this.config.getOrThrow("S3_ACCESS_KEY_ID"),
          secretAccessKey: this.config.getOrThrow("S3_SECRET_ACCESS_KEY"),
        },
        forcePathStyle: true,
      })
    }
    return this._client
  }

  private get bucket(): string {
    return this.config.getOrThrow("S3_BUCKET")
  }

  /** A presigned PUT URL; content-type is signed so the browser must honor it. */
  presignPut(
    key: string,
    contentType: string,
    expiresInSec: number
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: expiresInSec, signableHeaders: new Set(["content-type"]) }
    )
  }

  /** HEAD an object; `null` when it does not exist (a cancelled/failed upload). */
  async head(key: string): Promise<HeadResult | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      )
      return {
        contentLength: res.ContentLength ?? 0,
        contentType: res.ContentType ?? "",
      }
    } catch (err: unknown) {
      if (isNotFound(err)) return null
      throw err
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    )
  }

  /** Public URL an object is served from (MinIO bucket dev / R2 domain prod). */
  publicUrl(key: string): string {
    return `${this.config.getOrThrow<string>("MEDIA_PUBLIC_BASE_URL")}/${key}`
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404
}
