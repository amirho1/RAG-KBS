import { Inject, Injectable, Logger } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import qdrantConfig from "../../../config/qdrant.config.js";
import healthConfig from "../../../config/health.config.js";
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
    @Inject(qdrantConfig.KEY)
    private readonly qdrant: ConfigType<typeof qdrantConfig>,
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
        this.probeQdrantReadiness(),
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

  /**
   * Call the Qdrant readiness endpoint.
   * @returns Resolves when Qdrant is ready.
   */
  private async probeQdrantReadiness(): Promise<void> {
    const readinessUrl = new URL("/readyz", this.qdrant.url).toString();
    const headers: Record<string, string> = {};

    if (this.qdrant.apiKey.length > 0) {
      headers["api-key"] = this.qdrant.apiKey;
    }

    const response = await fetch(readinessUrl, { headers });

    if (!response.ok) {
      throw new Error(`Qdrant readiness check returned ${response.status}`);
    }
  }
}
