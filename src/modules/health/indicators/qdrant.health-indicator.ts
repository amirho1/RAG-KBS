import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import healthConfig from "../../../config/health.config.js";
import { QdrantService } from "../../qdrant/services/qdrant.service.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { sanitizeHealthError } from "../utils/sanitize-health-error.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "qdrant";
const failureMessage = "Qdrant health check failed";

/**
 * Qdrant health indicator using the HTTP readiness endpoint.
 */
@Injectable()
export class QdrantHealthIndicator {
  private readonly logger = new Logger(QdrantHealthIndicator.name);

  constructor(
    private readonly qdrantService: QdrantService,
    @Inject(healthConfig.KEY)
    private readonly health: ConfigType<typeof healthConfig>
  ) {}

  /**
   * Check Qdrant reachability via the readiness endpoint.
   * @returns The Qdrant health result.
   */
  async check(): Promise<DependencyHealthResult> {
    const startedAt = Date.now();

    try {
      await runWithTimeout(
        this.qdrantService.healthCheck(),
        this.health.qdrantTimeoutMs,
        dependencyName
      );

      return buildOkDependencyResult(dependencyName, Date.now() - startedAt);
    } catch (error) {
      const message = sanitizeHealthError(error, failureMessage);
      this.logger.error({ dependency: dependencyName, message });

      return buildErrorDependencyResult(dependencyName, failureMessage);
    }
  }
}
