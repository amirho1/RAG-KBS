import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Queue } from "bullmq";
import healthConfig from "../../../config/health.config.js";
import ingestionConfig from "../../../config/ingestion.config.js";
import redisConfig from "../../../config/redis.config.js";
import type { DependencyHealthResult } from "../types/health.types.js";
import {
  buildErrorDependencyResult,
  buildOkDependencyResult,
} from "../utils/build-dependency-result.js";
import { sanitizeHealthError } from "../utils/sanitize-health-error.js";
import { runWithTimeout } from "../utils/with-timeout.js";

const dependencyName = "queue";
const failureMessage = "Queue health check failed";

/**
 * BullMQ queue health indicator.
 */
@Injectable()
export class QueueHealthIndicator implements OnModuleDestroy {
  private readonly logger = new Logger(QueueHealthIndicator.name);
  private ingestionQueue: Queue | undefined;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly redis: ConfigType<typeof redisConfig>,
    @Inject(ingestionConfig.KEY)
    private readonly ingestion: ConfigType<typeof ingestionConfig>,
    @Inject(healthConfig.KEY)
    private readonly health: ConfigType<typeof healthConfig>
  ) {}

  /**
   * Close the BullMQ queue connection on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.ingestionQueue !== undefined) {
      await this.ingestionQueue.close();
      this.ingestionQueue = undefined;
    }
  }

  /**
   * Check BullMQ queue access using lightweight metadata.
   * @returns The queue health result.
   */
  async check(): Promise<DependencyHealthResult> {
    const startedAt = Date.now();

    try {
      await runWithTimeout(
        this.probeIngestionQueue(),
        this.health.queueTimeoutMs,
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
   * Inspect ingestion queue metadata without enqueueing jobs.
   */
  private async probeIngestionQueue(): Promise<void> {
    const queue =
      this.ingestionQueue ??
      new Queue(this.ingestion.queueName, {
        connection: {
          host: this.redis.host,
          port: this.redis.port,
          password:
            this.redis.password.length > 0 ? this.redis.password : undefined,
          maxRetriesPerRequest: null,
        },
        prefix: this.redis.queuePrefix,
      });

    this.ingestionQueue = queue;

    await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );
  }
}
