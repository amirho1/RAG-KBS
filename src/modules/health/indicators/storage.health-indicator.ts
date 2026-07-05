import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import healthConfig from "../../../config/health.config.js";
import { StorageService } from "../../storage/storage.service.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "storage";
const failureMessage = "Storage health check failed";

/**
 * Object storage health indicator backed by the selected storage driver.
 */
@Injectable()
export class StorageHealthIndicator {
  private readonly logger = new Logger(StorageHealthIndicator.name);

  constructor(
    private readonly storageService: StorageService,
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
      const result = await runWithTimeout(
        this.storageService.healthCheck(),
        this.health.storageTimeoutMs,
        dependencyName
      );

      if (result.status !== "ok") {
        throw new Error(result.message ?? failureMessage);
      }

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch {
      this.logger.error({
        dependency: dependencyName,
        message: failureMessage,
      });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }
}
