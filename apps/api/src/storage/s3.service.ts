import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Injectable } from "@nestjs/common"

import { env } from "../config/env"

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

  private get client(): S3Client {
    if (!this._client) {
      this._client = new S3Client({
        endpoint: required("S3_ENDPOINT", env.S3_ENDPOINT),
        region: required("S3_REGION", env.S3_REGION),
        credentials: {
          accessKeyId: required("S3_ACCESS_KEY_ID", env.S3_ACCESS_KEY_ID),
          secretAccessKey: required(
            "S3_SECRET_ACCESS_KEY",
            env.S3_SECRET_ACCESS_KEY
          ),
        },
        forcePathStyle: true,
      })
    }
    return this._client
  }

  private get bucket(): string {
    return required("S3_BUCKET", env.S3_BUCKET)
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
    return `${required("MEDIA_PUBLIC_BASE_URL", env.MEDIA_PUBLIC_BASE_URL)}/${key}`
  }
}

/** Storage vars are optional in the schema (prod-required) so the app boots
 * without media configured; this throws only when media is actually exercised. */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set (required for media storage)`)
  return value
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404
}
