import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { constants, createReadStream, createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
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
import { resolveSafeLocalObjectPath } from "../storage.utils.js";

/**
 * Local filesystem storage driver for development and tests.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly rootPath: string;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>
  ) {
    this.rootPath = resolve(storage.localPath);
  }

  /**
   * Store an object under the local storage root.
   * @param input - Object storage input.
   * @returns Stored object metadata.
   */
  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const objectPath = this.resolveObjectPath(input.objectKey);
    const temporaryPath = `${objectPath}.${randomUUID()}.tmp`;

    await mkdir(dirname(objectPath), { recursive: true });

    try {
      await this.writeObjectBody(temporaryPath, input.body);
      await rename(temporaryPath, objectPath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }

    return {
      provider: "LOCAL",
      objectKey: input.objectKey,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      etag: input.checksumSha256,
    };
  }

  /**
   * Read an object as a local file stream.
   * @param input - Object read input.
   * @returns Object read stream.
   */
  async getObject(input: GetObjectInput): Promise<NodeJS.ReadableStream> {
    const objectPath = this.resolveObjectPath(input.objectKey);
    await access(objectPath, constants.R_OK);

    return createReadStream(objectPath);
  }

  /**
   * Delete an object from local storage.
   * @param input - Object delete input.
   */
  async deleteObject(input: DeleteObjectInput): Promise<void> {
    const objectPath = this.resolveObjectPath(input.objectKey);
    await rm(objectPath, { force: true });
  }

  /**
   * Check whether a local object exists.
   * @param input - Object existence input.
   * @returns True when the object exists.
   */
  async exists(input: ExistsObjectInput): Promise<boolean> {
    const objectPath = this.resolveObjectPath(input.objectKey);

    try {
      await access(objectPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify local storage can write, read, and delete bytes.
   * @returns Safe health result.
   */
  async healthCheck(): Promise<StorageHealthResult> {
    const startedAt = Date.now();
    const objectKey = `.health-check/${randomUUID()}.txt`;
    const payload = Buffer.from("health-check", "utf8");
    let shouldCleanup = false;

    try {
      await this.putObject({
        objectKey,
        body: payload,
        sizeBytes: BigInt(payload.length),
        checksumSha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
        contentType: "text/plain",
      });
      shouldCleanup = true;

      const readPayload = await readFile(this.resolveObjectPath(objectKey));

      if (!readPayload.equals(payload)) {
        throw new Error("Local storage read/write verification failed.");
      }

      return {
        status: "ok",
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        status: "error",
        latencyMs: Date.now() - startedAt,
        message: "Local storage health check failed",
      };
    } finally {
      if (shouldCleanup) {
        await this.deleteObject({ objectKey }).catch(() => undefined);
      }
    }
  }

  /**
   * Resolve an object key inside the configured storage root.
   * @param objectKey - Storage object key.
   * @returns Absolute object path.
   */
  private resolveObjectPath(objectKey: string): string {
    return resolveSafeLocalObjectPath(this.rootPath, objectKey);
  }

  /**
   * Write buffer or stream content to a temporary file.
   * @param objectPath - Temporary target path.
   * @param body - Object body.
   */
  private async writeObjectBody(
    objectPath: string,
    body: Buffer | NodeJS.ReadableStream
  ): Promise<void> {
    if (Buffer.isBuffer(body)) {
      await writeFile(objectPath, body);
      return;
    }

    await pipeline(body, createWriteStream(objectPath));
  }
}
