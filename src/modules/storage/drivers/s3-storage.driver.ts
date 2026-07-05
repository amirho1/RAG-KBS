import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import storageConfig from "../../../config/storage.config.js";
import type {
  DeleteObjectInput,
  ExistsObjectInput,
  GetObjectInput,
  PutObjectInput,
  StorageDriver,
} from "../interfaces/storage-driver.interface.js";
import type {
  StoredObject,
  StorageHealthResult,
} from "../interfaces/stored-object.interface.js";
import { isNodeReadableStream } from "../storage.utils.js";

type S3Error = {
  name?: string;
  $metadata?: {
    httpStatusCode?: number;
  };
};

type ByteArrayTransformable = {
  transformToByteArray: () => Promise<Uint8Array>;
};

/**
 * S3-compatible storage driver for AWS S3, MinIO, and compatible providers.
 */
@Injectable()
export class S3StorageDriver implements StorageDriver, OnModuleDestroy {
  private readonly s3Client: S3Client;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>
  ) {
    this.s3Client = new S3Client({
      endpoint: storage.s3.endpoint,
      region: storage.s3.region,
      credentials: {
        accessKeyId: storage.s3.accessKeyId,
        secretAccessKey: storage.s3.secretAccessKey,
      },
      forcePathStyle: storage.s3.forcePathStyle,
    });
  }

  /**
   * Destroy the underlying S3 client.
   */
  onModuleDestroy(): void {
    this.s3Client.destroy();
  }

  /**
   * Upload an object to the configured S3-compatible bucket.
   * @param input - Object storage input.
   * @returns Stored object metadata.
   */
  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const bucket = input.bucket ?? this.storage.s3.bucket;
    const response = await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.objectKey,
        Body: input.body as PutObjectCommandInput["Body"],
        ContentLength: Number(input.sizeBytes),
        ContentType: input.contentType,
        Metadata: {
          checksumSha256: input.checksumSha256,
        },
      })
    );

    return {
      provider: "S3",
      bucket,
      objectKey: input.objectKey,
      region: this.storage.s3.region,
      endpoint: this.storage.s3.endpoint,
      versionId: response.VersionId,
      etag: response.ETag,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
    };
  }

  /**
   * Read an object from S3-compatible storage.
   * @param input - Object read input.
   * @returns Object body stream or buffer.
   */
  async getObject(
    input: GetObjectInput
  ): Promise<NodeJS.ReadableStream | Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: input.bucket ?? this.storage.s3.bucket,
        Key: input.objectKey,
      })
    );

    if (!response.Body) {
      throw new Error("S3 object response did not include a body.");
    }

    if (isNodeReadableStream(response.Body)) {
      return response.Body;
    }

    if (isByteArrayTransformable(response.Body)) {
      return Buffer.from(await response.Body.transformToByteArray());
    }

    throw new Error("S3 object body type is not supported.");
  }

  /**
   * Delete an object from S3-compatible storage.
   * @param input - Object delete input.
   */
  async deleteObject(input: DeleteObjectInput): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: input.bucket ?? this.storage.s3.bucket,
        Key: input.objectKey,
      })
    );
  }

  /**
   * Check whether an S3-compatible object exists.
   * @param input - Object existence input.
   * @returns True when the object exists.
   */
  async exists(input: ExistsObjectInput): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: input.bucket ?? this.storage.s3.bucket,
          Key: input.objectKey,
        })
      );

      return true;
    } catch (error) {
      if (isS3NotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Verify the configured S3-compatible bucket is reachable.
   * @returns Safe health result.
   */
  async healthCheck(): Promise<StorageHealthResult> {
    const startedAt = Date.now();

    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.storage.s3.bucket,
        })
      );

      return {
        status: "ok",
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: "error",
        latencyMs: Date.now() - startedAt,
        message: "S3 storage health check failed",
      };
    }
  }
}

/**
 * Determine whether an unknown S3 body can be converted to bytes.
 * @param value - Unknown S3 body value.
 * @returns True when the body supports byte conversion.
 */
function isByteArrayTransformable(
  value: unknown
): value is ByteArrayTransformable {
  return (
    typeof value === "object" &&
    value !== null &&
    "transformToByteArray" in value &&
    typeof value.transformToByteArray === "function"
  );
}

/**
 * Determine whether an AWS SDK error represents a missing object.
 * @param error - Caught S3 error.
 * @returns True when the error is a not-found response.
 */
function isS3NotFoundError(error: unknown): boolean {
  const s3Error = error as S3Error;

  return (
    s3Error.$metadata?.httpStatusCode === 404 ||
    s3Error.name === "NotFound" ||
    s3Error.name === "NoSuchKey" ||
    s3Error.name === "NotFoundException"
  );
}
