import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import healthConfig from "../../../config/health.config.js";
import storageConfig from "../../../config/storage.config.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { sanitizeHealthError } from "../utils/sanitize-health-error.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "storage";
const failureMessage = "Storage health check failed";

/**
 * Object storage health indicator for local and S3-compatible backends.
 */
@Injectable()
export class StorageHealthIndicator {
  private readonly logger = new Logger(StorageHealthIndicator.name);

  constructor(
    @Inject(storageConfig.KEY)
    private readonly storage: ConfigType<typeof storageConfig>,
    @Inject(healthConfig.KEY)
    private readonly health: ConfigType<typeof healthConfig>
  ) {}

  /**
   * Check storage connectivity based on the configured driver.
   * @returns The storage health result.
   */
  async check(): Promise<DependencyHealthResult> {
    const startedAt = Date.now();

    try {
      await runWithTimeout(
        this.storage.driver === "local"
          ? this.checkLocalStorage()
          : this.checkS3Storage(),
        this.health.storageTimeoutMs,
        dependencyName
      );

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch (error) {
      const message = sanitizeHealthError(error, failureMessage);
      this.logger.error({ dependency: dependencyName, message });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }

  /**
   * Verify local storage path exists and supports read/write.
   */
  private async checkLocalStorage(): Promise<void> {
    const storagePath = this.storage.localPath;

    await access(storagePath, constants.F_OK);
    await mkdir(storagePath, { recursive: true });

    const tempFilePath = join(storagePath, `.health-check-${randomUUID()}`);
    const payload = "health-check";

    try {
      await writeFile(tempFilePath, payload, "utf8");
      const readPayload = await readFile(tempFilePath, "utf8");

      if (readPayload !== payload) {
        throw new Error("Local storage read/write verification failed");
      }
    } finally {
      await rm(tempFilePath, { force: true });
    }
  }

  /**
   * Verify the configured S3 bucket is reachable.
   */
  private async checkS3Storage(): Promise<void> {
    const s3Client = new S3Client({
      endpoint: this.storage.s3.endpoint,
      region: this.storage.s3.region,
      credentials: {
        accessKeyId: this.storage.s3.accessKeyId,
        secretAccessKey: this.storage.s3.secretAccessKey,
      },
      forcePathStyle: this.storage.s3.forcePathStyle,
    });

    try {
      await s3Client.send(
        new HeadBucketCommand({
          Bucket: this.storage.s3.bucket,
        })
      );
    } finally {
      s3Client.destroy();
    }
  }
}
